package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentClient;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto;
import iuh.fit.hotelsystem_booking.entity.CheckoutType;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.LateCheckoutPaymentStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);

    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final BookingGuestService bookingGuestService;
    private final CheckInOutService checkInOutService;
    private final RefundCalculationService refundCalculationService;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentClient paymentClient;
    private final Clock clock;

    public CheckoutService(BookingRepository bookingRepository,
                           BookingStayRepository bookingStayRepository,
                           BookingGuestService bookingGuestService,
                           CheckInOutService checkInOutService,
                           RefundCalculationService refundCalculationService,
                           RabbitTemplate rabbitTemplate,
                           PaymentClient paymentClient,
                           ObjectProvider<Clock> clockProvider) {
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.bookingGuestService = bookingGuestService;
        this.checkInOutService = checkInOutService;
        this.refundCalculationService = refundCalculationService;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentClient = paymentClient;
        Clock providedClock = clockProvider != null ? clockProvider.getIfAvailable() : null;
        this.clock = providedClock != null ? providedClock : Clock.system(TimeConfig.VIETNAM_ZONE);
    }

    public CheckoutResponse calculateCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Booking cannot be checked out with current status: " + booking.getStatus());
        }

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        LocalDateTime actualCheckOutAt = LocalDateTime.now(clock);
        EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);
        int lateMinutes = calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
        BigDecimal lateFee = checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, true);
        RepresentativeView rep = resolveRepresentative(bookingId, stay);
        applyRepresentativeToResponse(response, rep);
        attachRefundAllocationPreview(bookingId, early, response);
        return response;
    }

    private void attachRefundAllocationPreview(Long bookingId, EarlyCheckoutRefundResult early, CheckoutResponse response) {
        if (early.getRefundAmount() == null || early.getRefundAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        try {
            List<RefundAllocationLineDto> lines = paymentClient.previewRefundAllocation(bookingId, early.getRefundAmount());
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
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Booking cannot be checked out with current status: " + booking.getStatus());
        }
        if (request == null || request.getStaffId() == null) {
            throw new IllegalArgumentException("staffId is required");
        }

        BookingStay stayExisting = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        RepresentativeView rep = resolveRepresentative(bookingId, stayExisting);
        validateCheckoutVerifier(rep, request);

        BookingStay stay = stayExisting != null ? stayExisting : new BookingStay();
        LocalDateTime actualCheckOutAt = LocalDateTime.now(clock);
        EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);

        int lateMinutes = calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
        BigDecimal lateFee = checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);

        stay.setBookingId(bookingId);
        stay.setActualCheckOutAt(actualCheckOutAt);
        stay.setCheckedOutByStaffId(request.getStaffId());
        stay.setEarlyCheckoutReason(request.getEarlyCheckoutReason());
        stay.setLateCheckoutMinutes(lateMinutes);
        stay.setLateCheckoutFee(lateFee);
        stay.setUsedNights(early.getUsedNights());
        stay.setChargeNights(early.getChargeNights());
        stay.setUnusedNights(early.getUnusedNights());
        stay.setRefundRate(early.getRefundRate());
        stay.setRefundAmount(early.getRefundAmount());

        if (Boolean.TRUE.equals(request.getVerificationOverride())) {
            stay.setCheckoutVerifiedManualOverride(true);
            stay.setCheckoutVerificationOverrideReason(request.getOverrideReason());
        } else {
            stay.setCheckoutVerifiedManualOverride(false);
            stay.setCheckoutVerificationOverrideReason(null);
        }

        if (early.getRefundAmount() != null && early.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_REFUND_PENDING);
            paymentClient.requestEarlyCheckoutRefund(bookingId, early.getRefundAmount(), "EARLY_CHECKOUT", request.getStaffId());
        }

        boolean paymentRequired = lateFee.compareTo(BigDecimal.ZERO) > 0;
        if (paymentRequired) {
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PENDING);
            booking.setStatus(BookingStatus.CHECKOUT_PENDING_PAYMENT);
            paymentClient.requestLateCheckoutFeePayment(bookingId, booking.getUserId(), lateFee);
            publishBookingEvent(booking, "LateCheckoutPaymentRequiredEvent");
        } else {
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
            booking.setStatus(BookingStatus.COMPLETED);
            publishBookingEvent(booking, "BookingCompletedEvent");
        }

        bookingStayRepository.save(stay);
        Booking saved = bookingRepository.save(booking);

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, saved.getStatus(), lateMinutes, lateFee, early, booking, false);
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
            if (!paymentClient.isLateCheckoutFeePaid(bookingId)) {
                throw new IllegalStateException("Late checkout fee is not PAID");
            }
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PAID);
            bookingStayRepository.save(stay);
        }

        booking.setStatus(BookingStatus.COMPLETED);
        Booking saved = bookingRepository.save(booking);
        publishBookingEvent(saved, "BookingCompletedEvent");
        return saved;
    }

    private CheckoutResponse buildResponse(Long bookingId,
                                          LocalDateTime actualCheckoutAt,
                                          BookingStatus status,
                                          int lateMinutes,
                                          BigDecimal lateFee,
                                          EarlyCheckoutRefundResult early,
                                          Booking booking,
                                          boolean preview) {
        CheckoutResponse response = new CheckoutResponse();
        response.setBookingId(bookingId);
        response.setActualCheckoutAt(actualCheckoutAt);
        response.setLateMinutes(lateMinutes);
        response.setLateCheckoutFee(lateFee);
        response.setLateFee(lateFee);
        response.setBookingStatus(status != null ? status.name() : null);
        response.setEarlyCheckout(early.isEarlyCheckout());
        response.setTotalNights(early.getTotalNights());
        response.setUsedNights(early.getUsedNights());
        response.setChargeNights(early.getChargeNights());
        response.setUnusedNights(early.getUnusedNights());
        response.setRefundRate(early.getRefundRate());
        response.setRefundAmount(early.getRefundAmount());
        response.setEffectivePricePerNight(early.getEffectivePricePerNight());
        response.setPaymentRequired(lateFee != null && lateFee.compareTo(BigDecimal.ZERO) > 0);
        response.setCheckoutType(resolveCheckoutType(early.isEarlyCheckout(), lateFee));
        response.setFinalAmount(resolveFinalAmount(lateFee, early.getRefundAmount()));
        response.setRoomNextStatus(null);
        if (booking != null && booking.getRatePlan() != null) {
            response.setRateType(booking.getRatePlan().name());
        }
        boolean refundRequired = early.getRefundAmount() != null && early.getRefundAmount().compareTo(BigDecimal.ZERO) > 0;
        response.setRefundRequired(refundRequired);
        response.setMessage(buildMessage(response, booking, preview));
        return response;
    }

    private String resolveCheckoutType(boolean early, BigDecimal lateFee) {
        boolean late = lateFee != null && lateFee.compareTo(BigDecimal.ZERO) > 0;
        if (early && late) return CheckoutType.EARLY_AND_LATE.name();
        if (early) return CheckoutType.EARLY.name();
        if (late) return CheckoutType.LATE.name();
        return CheckoutType.NORMAL.name();
    }

    private BigDecimal resolveFinalAmount(BigDecimal lateFee, BigDecimal refundAmount) {
        BigDecimal fee = lateFee != null ? lateFee : BigDecimal.ZERO;
        BigDecimal refund = refundAmount != null ? refundAmount : BigDecimal.ZERO;
        return fee.subtract(refund);
    }

    private String buildMessage(CheckoutResponse response, Booking booking, boolean preview) {
        if (response == null) return null;
        if (response.isPaymentRequired()) {
            return "Cần thu phí checkout trễ trước khi hoàn tất checkout.";
        }
        if (preview && CheckoutType.EARLY.name().equals(response.getCheckoutType())
                && Boolean.TRUE.equals(response.getRefundRequired())) {
            return "Checkout sớm. Hệ thống sẽ tạo yêu cầu hoàn tiền theo giao dịch thanh toán gốc.";
        }
        if (!preview && booking != null && booking.getPaymentStatus() != null
                && BookingConstants.PAYMENT_STATUS_REFUND_PENDING.equalsIgnoreCase(booking.getPaymentStatus())) {
            return "Đã gửi yêu cầu hoàn tiền sang Payment Service (theo người đã thanh toán từng khoản).";
        }
        return "Checkout calculated successfully.";
    }

    /**
     * Một lần resolve + tái dùng cho xác minh và response (tránh gọi {@code getGuests} hai lần).
     */
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
        if (stay != null) {
            return new RepresentativeView(
                    stay.getRepresentativeGuestId(),
                    stay.getRepresentativeFullName(),
                    stay.getRepresentativePhone(),
                    stay.getRepresentativeCccd());
        }
        return RepresentativeView.EMPTY;
    }

    /** Một vòng lặp: ưu tiên người check-in, không thì khách chính. */
    private static BookingGuest pickRepresentativeGuest(List<BookingGuest> guests) {
        BookingGuest primary = null;
        for (BookingGuest g : guests) {
            if (Boolean.TRUE.equals(g.getCheckInPerson())) {
                return g;
            }
            if (primary == null && Boolean.TRUE.equals(g.getPrimaryGuest())) {
                primary = g;
            }
        }
        return primary;
    }

    /**
     * Staff đối chiếu người đứng quầy với thông tin đại diện đã lưu lúc check-in (hiển thị read-only trên UI).
     * Không bắt nhập lại họ tên/SĐT/CCCD — chỉ xử lý override có lý do khi cần ngoại lệ.
     */
    private void validateCheckoutVerifier(RepresentativeView rep, CheckOutRequest request) {
        if (!rep.requiresVerification()) {
            return;
        }
        if (Boolean.TRUE.equals(request.getVerificationOverride())) {
            if (request.getOverrideReason() == null || request.getOverrideReason().isBlank()) {
                throw new IllegalArgumentException("overrideReason is required when verificationOverride is true");
            }
        }
    }

    private void applyRepresentativeToResponse(CheckoutResponse response, RepresentativeView rep) {
        if (!rep.hasRepresentativeInfo()) {
            return;
        }
        response.setRepresentativeGuestId(rep.guestId());
        response.setRepresentativeFullName(rep.fullName());
        response.setRepresentativePhone(rep.phone());
        response.setRepresentativeCccd(rep.cccd());
    }

    private static boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    /**
     * Snapshot đại diện — dùng chung cho modal staff và rule xác minh.
     */
    private record RepresentativeView(Long guestId, String fullName, String phone, String cccd) {
        static final RepresentativeView EMPTY = new RepresentativeView(null, null, null, null);

        boolean hasRepresentativeInfo() {
            return guestId != null || hasText(fullName) || hasText(phone) || hasText(cccd);
        }

        boolean requiresVerification() {
            return hasText(fullName);
        }

        private static boolean hasText(String s) {
            return s != null && !s.isBlank();
        }
    }

    private int calculateLateMinutesForCheckout(Booking booking, LocalDateTime actualCheckOutAt, boolean earlyCheckout) {
        if (booking != null && booking.getCheckOut() != null
                && actualCheckOutAt.toLocalDate().isBefore(booking.getCheckOut())) {
            return 0;
        }
        return checkInOutService.calculateLateCheckoutMinutes(booking, actualCheckOutAt);
    }

    private void publishBookingEvent(Booking booking, String status) {
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), status);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.status", event);
    }
}
