package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto;
import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import iuh.fit.hotelsystem_booking.entity.CheckoutType;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.LateCheckoutPaymentStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final BookingGuestService bookingGuestService;
    private final CheckInOutService checkInOutService;
    private final CheckInOutScheduledService scheduledService;
    private final RoomServiceClient roomServiceClient;
    private final RefundCalculationService refundCalculationService;
    private final RefundService refundService;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentServiceClient paymentServiceClient;
    private final Clock clock;

    @Autowired
    public CheckoutService(BookingRepository bookingRepository,
                           BookingStayRepository bookingStayRepository,
                           BookingGuestService bookingGuestService,
                           CheckInOutService checkInOutService,
                           CheckInOutScheduledService scheduledService,
                           RoomServiceClient roomServiceClient,
                           RefundCalculationService refundCalculationService,
                           RefundService refundService,
                           RabbitTemplate rabbitTemplate,
                           PaymentServiceClient paymentServiceClient,
                           ObjectProvider<Clock> clockProvider) {
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.bookingGuestService = bookingGuestService;
        this.checkInOutService = checkInOutService;
        this.scheduledService = scheduledService;
        this.roomServiceClient = roomServiceClient;
        this.refundCalculationService = refundCalculationService;
        this.refundService = refundService;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentServiceClient = paymentServiceClient;
        Clock providedClock = clockProvider != null ? clockProvider.getIfAvailable() : null;
        this.clock = providedClock != null ? providedClock : Clock.system(TimeConfig.VIETNAM_ZONE);
    }

    /**
     * Backward-compatible constructor used by existing tests that expect the older
     * constructor signature. It delegates to the primary constructor with a
     * null RefundService (tests should mock interactions as needed).
     */
    public CheckoutService(BookingRepository bookingRepository,
                           BookingStayRepository bookingStayRepository,
                           BookingGuestService bookingGuestService,
                           CheckInOutService checkInOutService,
                           CheckInOutScheduledService scheduledService,
                           RoomServiceClient roomServiceClient,
                           RefundCalculationService refundCalculationService,
                           RabbitTemplate rabbitTemplate,
                           PaymentServiceClient paymentServiceClient,
                           ObjectProvider<Clock> clockProvider) {
        this(bookingRepository, bookingStayRepository, bookingGuestService, checkInOutService, scheduledService,
                roomServiceClient, refundCalculationService, null, rabbitTemplate, paymentServiceClient, clockProvider);
    }

    public CheckoutResponse calculateCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        if (booking.getStatus() == BookingStatus.CHECKED_IN || booking.getStatus() == BookingStatus.COMPLETED) {
            LocalDateTime actualCheckOutAt = booking.getActualCheckOutAt() != null ? booking.getActualCheckOutAt() : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);
            
            int lateMinutes = stay != null && stay.getLateCheckoutMinutes() != null ? stay.getLateCheckoutMinutes() : calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            
            BigDecimal lateFee = stay != null && stay.getLateCheckoutFee() != null ? stay.getLateCheckoutFee() : checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);

            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, true);
            RepresentativeView rep = resolveRepresentative(bookingId, stay);
            applyRepresentativeToResponse(response, rep);
            attachRefundAllocationPreview(bookingId, early, response);
            return response;
        }

        if (booking.getStatus() == BookingStatus.CHECKOUT_PENDING_PAYMENT) {
            if (stay == null) {
                throw new IllegalStateException("Checkout has not been started for booking: " + bookingId);
            }
            LocalDateTime actualCheckOutAt = stay.getActualCheckOutAt() != null ? stay.getActualCheckOutAt() : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);
            int lateMinutes = stay.getLateCheckoutMinutes() != null ? stay.getLateCheckoutMinutes() : calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            BigDecimal lateFee = stay.getLateCheckoutFee() != null ? stay.getLateCheckoutFee() : checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);
            boolean lateFeePaid = lateFee.compareTo(BigDecimal.ZERO) > 0 && isLateCheckoutFeePaid(bookingId);

            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, true);
            if (lateFeePaid) {
                response.setPaymentRequired(false);
            }
            RepresentativeView rep = resolveRepresentative(bookingId, stay);
            applyRepresentativeToResponse(response, rep);
            attachRefundAllocationPreview(bookingId, early, response);
            return response;
        }

        throw new IllegalStateException("Booking cannot be checked out with current status: " + booking.getStatus());
    }

    private void attachRefundAllocationPreview(Long bookingId, EarlyCheckoutRefundResult early, CheckoutResponse response) {
        if (early.getRefundAmount() == null || early.getRefundAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("amount", early.getRefundAmount());
            List<RefundAllocationLineDto> lines = paymentServiceClient.previewRefundAllocation(bookingId, req);
            response.setRefundAllocations(lines != null ? lines : Collections.emptyList());
        } catch (Exception ex) {
            log.warn("Could not load refund allocation preview for booking {}: {}", bookingId, ex.getMessage());
            response.setRefundAllocations(Collections.emptyList());
        }
    }

    @Transactional
    public CheckoutResponse checkout(Long bookingId, CheckOutRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (request == null || request.getStaffId() == null) {
            throw new IllegalArgumentException("staffId is required");
        }

        BookingStay stayExisting = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        RepresentativeView rep = resolveRepresentative(bookingId, stayExisting);

        if (booking.getStatus() == BookingStatus.COMPLETED) {
            log.info("Booking {} is already COMPLETED. Returning current state.", bookingId);
            LocalDateTime actualCheckOutAt = booking.getActualCheckOutAt() != null ? booking.getActualCheckOutAt() : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stayExisting, actualCheckOutAt);
            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), 
                stayExisting != null ? stayExisting.getLateCheckoutMinutes() : 0, 
                stayExisting != null ? stayExisting.getLateCheckoutFee() : BigDecimal.ZERO, 
                early, booking, false);
            applyRepresentativeToResponse(response, rep);
            response.setMessage("Booking Ä‘Ã£ hoÃ n táº¥t checkout trÆ°á»›c Ä‘Ã³.");
            return response;
        }

        if (booking.getStatus() == BookingStatus.CHECKOUT_PENDING_PAYMENT) {
            if (stayExisting == null) {
                throw new IllegalStateException("Checkout stay record missing for pending payment booking: " + bookingId);
            }
            validateCheckoutVerifier(rep, request);

            LocalDateTime actualCheckOutAt = stayExisting.getActualCheckOutAt() != null ? stayExisting.getActualCheckOutAt() : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stayExisting, actualCheckOutAt);
            int lateMinutes = stayExisting.getLateCheckoutMinutes() != null ? stayExisting.getLateCheckoutMinutes() : calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            BigDecimal lateFee = stayExisting.getLateCheckoutFee() != null ? stayExisting.getLateCheckoutFee() : checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);
            boolean lateFeePaid = lateFee.compareTo(BigDecimal.ZERO) > 0 && isLateCheckoutFeePaid(bookingId);
            if (lateFeePaid && stayExisting.getLateCheckoutPaymentStatus() != LateCheckoutPaymentStatus.PAID) {
                stayExisting.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PAID);
                bookingStayRepository.save(stayExisting);
            }

            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, false);
            response.setPaymentRequired(!lateFeePaid && lateFee.compareTo(BigDecimal.ZERO) > 0);
            applyRepresentativeToResponse(response, rep);
            return response;
        }

        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CHECKOUT_PENDING_PAYMENT) {
            throw new IllegalArgumentException("Tráº¡ng thÃ¡i booking khÃ´ng há»£p lá»‡ Ä‘á»ƒ thá»±c hiá»‡n checkout: " + booking.getStatus());
        }
        
        validateCheckoutVerifier(rep, request);

        BookingStay stay = stayExisting != null ? stayExisting : new BookingStay();
        LocalDateTime actualCheckOutAt = LocalDateTime.now(clock);
        EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);

        int lateMinutes = calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
        if (early.isEarlyCheckout()) {
            lateMinutes = 0;
        }
        BigDecimal fee = checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);
        BigDecimal rawRefund = (early != null && early.getRefundAmount() != null) ? early.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal finalAmount = fee.subtract(rawRefund);
        
        boolean paymentRequired = finalAmount.compareTo(BigDecimal.ZERO) > 0;
        boolean refundRequired = finalAmount.compareTo(BigDecimal.ZERO) < 0;

        stay.setBookingId(bookingId);
        stay.setActualCheckOutAt(actualCheckOutAt);
        stay.setCheckedOutByStaffId(request.getStaffId());
        stay.setEarlyCheckoutReason(request.getEarlyCheckoutReason());
        stay.setLateCheckoutMinutes(lateMinutes);
        stay.setLateCheckoutFee(fee);
        stay.setUsedNights(early.getUsedNights());
        stay.setChargeNights(early.getChargeNights());
        stay.setUnusedNights(early.getUnusedNights());
        stay.setRefundRate(early.getRefundRate());
        stay.setRefundAmount(rawRefund);

        if (Boolean.TRUE.equals(request.getVerificationOverride())) {
            stay.setCheckoutVerifiedManualOverride(true);
            stay.setCheckoutVerificationOverrideReason(request.getOverrideReason());
        } else {
            stay.setCheckoutVerifiedManualOverride(false);
            stay.setCheckoutVerificationOverrideReason(null);
        }

        if (refundRequired) {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_REFUND_PENDING);
        }

        if (paymentRequired) {
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PENDING);
            booking.setStatus(BookingStatus.CHECKOUT_PENDING_PAYMENT);
            publishBookingEvent(booking, "LateCheckoutPaymentRequiredEvent");
        } else {
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
            booking.setStatus(BookingStatus.COMPLETED);
            publishBookingEvent(booking, "BookingCompletedEvent");
        }

        booking.setActualCheckOutAt(actualCheckOutAt);
        bookingStayRepository.save(stay);
        Booking saved = bookingRepository.save(booking);

        if (paymentRequired) {
            try {
                iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest lateReq = new iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest();
                lateReq.setBookingId(bookingId);
                lateReq.setUserId(booking.getUserId());
                lateReq.setAmount(fee.doubleValue());
                paymentServiceClient.requestLateCheckoutFeePayment(bookingId, lateReq);
            } catch (Exception e) {
                throw new IllegalStateException("KhÃ´ng thá»ƒ táº¡o yÃªu cáº§u thanh toÃ¡n checkout trá»… do Payment Service khÃ´ng pháº£n há»“i. Vui lÃ²ng thá»­ láº¡i sau.", e);
            }
        }

        try {
            // Khi báº¯t Ä‘áº§u checkout (ká»ƒ cáº£ cÃ³ phÃ­ trá»… hay khÃ´ng), khÃ¡ch rá»i phÃ²ng nÃªn luÃ´n dá»n dáº¹p vÃ  Ä‘áº·t CLEANING láº­p tá»©c
            scheduledService.initCleaningTimer(saved);
            saved = bookingRepository.save(saved); // LÆ°u láº¡i cleaningStartAt vÃ  cleaningEndAt
            setRoomStatus(saved.getRoomId(), "CLEANING");
        } catch (Exception e) {
            log.error("Post-checkout processing failed for room {}: {}", saved.getRoomId(), e.getMessage());
        }

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, saved.getStatus(), lateMinutes, fee, early, booking, false);
        response.setPaymentRequired(paymentRequired);
        applyRepresentativeToResponse(response, rep);
        return response;
    }

    @Transactional
    public Booking completeCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        BookingStay stay = bookingStayRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new IllegalStateException("Checkout has not been started for booking: " + bookingId));

        BigDecimal lateFee = stay.getLateCheckoutFee() != null ? stay.getLateCheckoutFee() : BigDecimal.ZERO;
        if (lateFee.compareTo(BigDecimal.ZERO) > 0) {
            iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse status = paymentServiceClient.getLateCheckoutFeeStatus(bookingId);
            if (status == null || (!"PAID".equalsIgnoreCase(status.getStatus()) && !"SUCCESS".equalsIgnoreCase(status.getStatus()))) {
                throw new IllegalStateException("Late checkout fee is not PAID");
            }
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PAID);
            bookingStayRepository.save(stay);
        }

        if (booking.getActualCheckOutAt() == null && stay.getActualCheckOutAt() != null) {
            booking.setActualCheckOutAt(stay.getActualCheckOutAt());
        }

        booking.setStatus(BookingStatus.COMPLETED);
        Booking saved = bookingRepository.save(booking);
        publishBookingEvent(saved, "BookingCompletedEvent");
        return saved;
    }

    private void setRoomStatus(Long roomId, String status) {
        if (roomId == null) return;
        RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
        dto.setRoomId(roomId);
        dto.setStatus(status);
        roomServiceClient.updateRoomStatus(roomId, dto);
    }

    private CheckoutResponse buildResponse(Long bookingId,
                                           LocalDateTime actualCheckoutAt,
                                           BookingStatus status,
                                           int lateMinutes,
                                           BigDecimal lateFee,
                                           EarlyCheckoutRefundResult early,
                                           Booking booking,
                                           boolean preview) {
        boolean earlyCheckout = early != null && early.isEarlyCheckout();
        BigDecimal rawRefund = (early != null && early.getRefundAmount() != null) ? early.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal fee = lateFee != null ? lateFee : BigDecimal.ZERO;
        BigDecimal finalAmount = fee.subtract(rawRefund);
        
        boolean paymentRequired = finalAmount.compareTo(BigDecimal.ZERO) > 0;
        boolean refundRequired = finalAmount.compareTo(BigDecimal.ZERO) < 0;

        CheckoutResponse response = new CheckoutResponse();
        response.setBookingId(bookingId);
        response.setActualCheckoutAt(actualCheckoutAt);
        response.setLateMinutes(lateMinutes);
        response.setLateCheckoutFee(fee);
        response.setLateFee(fee);
        response.setBookingStatus(status != null ? status.name() : null);
        response.setEarlyCheckout(earlyCheckout);
        response.setTotalNights(early != null ? early.getTotalNights() : 0);
        response.setUsedNights(early != null ? early.getUsedNights() : 0);
        response.setChargeNights(early != null ? early.getChargeNights() : 0);
        response.setUnusedNights(early != null ? early.getUnusedNights() : 0);
        response.setRefundRate(early != null ? early.getRefundRate() : BigDecimal.ZERO);
        response.setRefundAmount(rawRefund);
        response.setEffectivePricePerNight(early != null ? early.getEffectivePricePerNight() : BigDecimal.ZERO);
        response.setFinalAmount(finalAmount);
        response.setPaymentRequired(paymentRequired);
        response.setRefundRequired(refundRequired);
        response.setCheckoutType(resolveCheckoutType(earlyCheckout, fee));
        
        if (booking != null && booking.getRatePlan() != null) {
            response.setRateType(booking.getRatePlan().name());
        }
        response.setMessage(buildMessage(response, booking, preview));
        return response;
    }

    private String resolveCheckoutType(boolean earlyCheckout, BigDecimal lateFee) {
        boolean late = lateFee != null && lateFee.compareTo(BigDecimal.ZERO) > 0;
        if (earlyCheckout && late) return CheckoutType.EARLY_AND_LATE.name();
        if (earlyCheckout) return CheckoutType.EARLY.name();
        if (late) return CheckoutType.LATE.name();
        return CheckoutType.NORMAL.name();
    }

    private String buildMessage(CheckoutResponse response, Booking booking, boolean preview) {
        if (response == null) return null;
        if (response.isPaymentRequired()) {
            return "Cáº§n thu phÃ­ checkout trá»… trÆ°á»›c khi hoÃ n táº¥t checkout.";
        }
        if (preview && CheckoutType.EARLY.name().equals(response.getCheckoutType())
                && Boolean.TRUE.equals(response.getRefundRequired())) {
            return "Checkout sá»›m (Há»‡ thá»‘ng sáº½ hoÃ n tiá»n).";
        }
        return "Checkout calculated successfully.";
    }

    private RepresentativeView resolveRepresentative(Long bookingId, BookingStay stay) {
        if (stay != null && hasText(stay.getRepresentativeFullName())) {
            return new RepresentativeView(
                    stay.getRepresentativeGuestId(),
                    stay.getRepresentativeFullName(),
                    stay.getRepresentativePhone(),
                    stay.getRepresentativeCccd());
        }
        List<BookingGuest> guests = bookingGuestService.getGuests(bookingId);
        BookingGuest guest = pickRepresentativeGuest(guests);
        if (guest != null && hasText(guest.getFullName())) {
            return new RepresentativeView(guest.getId(), guest.getFullName(), guest.getPhone(), guest.getCccd());
        }
        return RepresentativeView.EMPTY;
    }

    private static BookingGuest pickRepresentativeGuest(List<BookingGuest> guests) {
        BookingGuest primary = null;
        BookingGuest firstAdult = null;
        for (BookingGuest g : guests) {
            if (g == null) continue;
            if (Boolean.TRUE.equals(g.getCheckInPerson())) return g;
            if (primary == null && Boolean.TRUE.equals(g.getPrimaryGuest())) primary = g;
            if (firstAdult == null && g.isAdultOn(LocalDate.now())) firstAdult = g;
        }
        return primary != null ? primary : firstAdult;
    }

    private void validateCheckoutVerifier(RepresentativeView rep, CheckOutRequest request) {
        if (rep.fullName() != null && !rep.fullName().isBlank() && Boolean.TRUE.equals(request.getVerificationOverride())) {
            if (request.getOverrideReason() == null || request.getOverrideReason().isBlank()) {
                throw new IllegalArgumentException("overrideReason is required when verificationOverride is true");
            }
        }
    }

    private void applyRepresentativeToResponse(CheckoutResponse response, RepresentativeView rep) {
        if (rep == null) return;
        response.setRepresentativeGuestId(rep.guestId());
        response.setRepresentativeFullName(rep.fullName());
        response.setRepresentativePhone(rep.phone());
        response.setRepresentativeCccd(rep.cccd());
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private record RepresentativeView(Long guestId, String fullName, String phone, String cccd) {
        static final RepresentativeView EMPTY = new RepresentativeView(null, null, null, null);
    }

    private int calculateLateMinutesForCheckout(Booking booking, LocalDateTime actualCheckOutAt, boolean earlyCheckout) {
        if (booking == null || booking.getCheckOut() == null) return 0;
        LocalDate plannedDate = booking.getCheckOut();
        LocalDate actualDate = actualCheckOutAt.toLocalDate();

        if (actualDate.isBefore(plannedDate)) {
            return 0;
        }

        LocalDateTime officialCheckOutAt = plannedDate.atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        long minutes = java.time.temporal.ChronoUnit.MINUTES.between(officialCheckOutAt, actualCheckOutAt);
        return (int) Math.max(minutes, 0);
    }

    private void publishBookingEvent(Booking booking, String status) {
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), status);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.status", event);
    }

    private boolean isLateCheckoutFeePaid(Long bookingId) {
        try {
            String status = paymentServiceClient.getLateCheckoutFeeStatus(bookingId).getStatus();
            return "PAID".equalsIgnoreCase(status) || "SUCCESS".equalsIgnoreCase(status);
        } catch (Exception e) {
            return false;
        }
    }
}
