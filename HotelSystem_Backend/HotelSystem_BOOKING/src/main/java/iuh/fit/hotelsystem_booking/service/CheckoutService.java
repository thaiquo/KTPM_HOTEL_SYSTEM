package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
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
import com.fasterxml.jackson.databind.ObjectMapper;

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
    private iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository serviceLineRepository;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentServiceClient paymentServiceClient;
    private iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository invoiceRepository;
    private BookingInvoiceService bookingInvoiceService;
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
        this.serviceLineRepository = null;
        this.rabbitTemplate = rabbitTemplate;
        this.paymentServiceClient = paymentServiceClient;
        this.invoiceRepository = null;
        this.bookingInvoiceService = null;
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

        @Autowired
        public void setServiceLineRepository(iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository repo) {
            // optional injection
            try { this.serviceLineRepository = repo; } catch (Exception ignored) {}
        }

        @Autowired
        public void setInvoiceRepository(iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository repo) {
            try { this.invoiceRepository = repo; } catch (Exception ignored) {}
        }

        @Autowired
        public void setBookingInvoiceService(BookingInvoiceService bookingInvoiceService) {
            try { this.bookingInvoiceService = bookingInvoiceService; } catch (Exception ignored) {}
        }

    public CheckoutResponse calculateCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        if (booking.getStatus() == BookingStatus.CHECKED_IN || booking.getStatus() == BookingStatus.COMPLETED) {
            LocalDateTime actualCheckOutAt = booking.getActualCheckOutAt() != null ? booking.getActualCheckOutAt() : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);
            
            boolean activeCheckoutPreview = booking.getStatus() == BookingStatus.CHECKED_IN && booking.getActualCheckOutAt() == null;
            int lateMinutes = activeCheckoutPreview || stay == null || stay.getLateCheckoutMinutes() == null
                    ? calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout())
                    : stay.getLateCheckoutMinutes();
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            
            BigDecimal lateFee = activeCheckoutPreview || stay == null || stay.getLateCheckoutFee() == null
                    ? checkInOutService.calculateLateCheckoutFee(booking, lateMinutes)
                    : stay.getLateCheckoutFee();

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
            LocalDateTime lockedCheckOutAt = resolveLockedCheckoutAt(booking, stay);
            boolean hasLockedCheckOutAt = lockedCheckOutAt != null;
            LocalDateTime actualCheckOutAt = hasLockedCheckOutAt ? lockedCheckOutAt : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stay, actualCheckOutAt);
            int lateMinutes = hasLockedCheckOutAt && stay.getLateCheckoutMinutes() != null
                    ? stay.getLateCheckoutMinutes()
                    : calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            BigDecimal lateFee = hasLockedCheckOutAt && stay.getLateCheckoutFee() != null
                    ? stay.getLateCheckoutFee()
                    : checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);
            BigDecimal serviceTotal = calculateServiceTotal(bookingId);
            BigDecimal rawRefund = (early != null && early.getRefundAmount() != null) ? early.getRefundAmount() : BigDecimal.ZERO;
            BigDecimal invoiceTotal = calculateInvoiceTotal(booking, lateFee, serviceTotal, rawRefund);
            BigDecimal amountDue = invoiceTotal.subtract(calculateAmountPaid(booking)).max(BigDecimal.ZERO);
            boolean checkoutChargesPaid = amountDue.compareTo(BigDecimal.ZERO) > 0 && isLateCheckoutFeePaid(bookingId);

            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, true);
            if (amountDue.compareTo(BigDecimal.ZERO) > 0) {
                response.setPaymentRequired(!checkoutChargesPaid);
            }
            if (checkoutChargesPaid) {
                response.setPaymentRequired(false);
            }
            RepresentativeView rep = resolveRepresentative(bookingId, stay);
            applyRepresentativeToResponse(response, rep);
            attachRefundAllocationPreview(bookingId, early, response);
            return response;
        }

        throw new IllegalStateException("Booking cannot be checked out with current status: " + booking.getStatus());
    }

    public BookingInvoiceDto getInvoice(Long bookingId) {
        if (bookingInvoiceService != null) {
            return bookingInvoiceService.getLatestInvoice(bookingId);
        }
        if (invoiceRepository == null) throw new IllegalStateException("Invoice repository not available");
        iuh.fit.hotelsystem_booking.entity.BookingInvoice inv = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found for booking: " + bookingId));
        BookingInvoiceDto dto = new BookingInvoiceDto();
        dto.setId(inv.getId());
        dto.setBookingId(inv.getBookingId());
        dto.setAmount(inv.getAmount());
        dto.setCurrency(inv.getCurrency());
        try {
            ObjectMapper mapper = new ObjectMapper();
            Object lines = mapper.readValue(inv.getLinesJson() != null ? inv.getLinesJson() : "{}", Object.class);
            dto.setLines(lines);
        } catch (Exception e) {
            dto.setLines(inv.getLinesJson());
        }
        dto.setCreatedAt(inv.getCreatedAt());
        return dto;
    }

    public java.util.List<BookingInvoiceDto> listInvoices() {
        if (bookingInvoiceService != null) {
            return bookingInvoiceService.listInvoices();
        }
        if (invoiceRepository == null) return java.util.Collections.emptyList();
        java.util.Map<Long, BookingInvoiceDto> outByBooking = new java.util.LinkedHashMap<>();
        ObjectMapper mapper = new ObjectMapper();
        for (iuh.fit.hotelsystem_booking.entity.BookingInvoice inv : invoiceRepository.findAll()) {
            BookingInvoiceDto dto = new BookingInvoiceDto();
            dto.setId(inv.getId());
            dto.setBookingId(inv.getBookingId());
            dto.setAmount(inv.getAmount());
            dto.setCurrency(inv.getCurrency());
            try { dto.setLines(mapper.readValue(inv.getLinesJson() != null ? inv.getLinesJson() : "{}", Object.class)); } catch (Exception e) { dto.setLines(inv.getLinesJson()); }
            dto.setCreatedAt(inv.getCreatedAt());
            outByBooking.putIfAbsent(inv.getBookingId(), dto);
        }
        return new java.util.ArrayList<>(outByBooking.values());
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

            LocalDateTime lockedCheckOutAt = resolveLockedCheckoutAt(booking, stayExisting);
            boolean hasLockedCheckOutAt = lockedCheckOutAt != null;
            LocalDateTime actualCheckOutAt = hasLockedCheckOutAt ? lockedCheckOutAt : LocalDateTime.now(clock);
            EarlyCheckoutRefundResult early = refundCalculationService.calculateEarlyCheckoutRefund(booking, stayExisting, actualCheckOutAt);
            int lateMinutes = hasLockedCheckOutAt && stayExisting.getLateCheckoutMinutes() != null
                    ? stayExisting.getLateCheckoutMinutes()
                    : calculateLateMinutesForCheckout(booking, actualCheckOutAt, early.isEarlyCheckout());
            if (early.isEarlyCheckout()) {
                lateMinutes = 0;
            }
            BigDecimal lateFee = hasLockedCheckOutAt && stayExisting.getLateCheckoutFee() != null
                    ? stayExisting.getLateCheckoutFee()
                    : checkInOutService.calculateLateCheckoutFee(booking, lateMinutes);
            BigDecimal serviceTotal = calculateServiceTotal(bookingId);
            BigDecimal rawRefund = (early != null && early.getRefundAmount() != null) ? early.getRefundAmount() : BigDecimal.ZERO;
            BigDecimal invoiceTotal = calculateInvoiceTotal(booking, lateFee, serviceTotal, rawRefund);
            BigDecimal amountDue = invoiceTotal.subtract(calculateAmountPaid(booking)).max(BigDecimal.ZERO);
            boolean checkoutChargesPaid = amountDue.compareTo(BigDecimal.ZERO) > 0 && isLateCheckoutFeePaid(bookingId);
            if (checkoutChargesPaid && stayExisting.getLateCheckoutPaymentStatus() != LateCheckoutPaymentStatus.PAID) {
                stayExisting.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PAID);
                bookingStayRepository.save(stayExisting);
            }

            if (!hasLockedCheckOutAt) {
                stayExisting.setActualCheckOutAt(actualCheckOutAt);
                stayExisting.setLateCheckoutMinutes(lateMinutes);
                stayExisting.setLateCheckoutFee(lateFee);
                booking.setActualCheckOutAt(actualCheckOutAt);
                bookingStayRepository.save(stayExisting);
                bookingRepository.save(booking);
            }

            if (amountDue.compareTo(BigDecimal.ZERO) > 0 && !checkoutChargesPaid) {
                boolean alreadyPending = stayExisting.getLateCheckoutPaymentStatus() == LateCheckoutPaymentStatus.PENDING
                        || booking.getStatus() == BookingStatus.CHECKOUT_PENDING_PAYMENT;
                stayExisting.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PENDING);
                bookingStayRepository.save(stayExisting);
                if (alreadyPending) {
                    CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, false);
                    response.setPaymentRequired(true);
                    applyRepresentativeToResponse(response, rep);
                    return response;
                }
                try {
                    iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest lateReq = new iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest();
                    lateReq.setBookingId(bookingId);
                    lateReq.setUserId(booking.getUserId());
                    lateReq.setAmount(amountDue.doubleValue());
                    paymentServiceClient.requestLateCheckoutFeePayment(bookingId, lateCheckoutFeeIdempotencyKey(bookingId, amountDue.doubleValue()), lateReq);
                } catch (Exception e) {
                    throw new IllegalStateException("KhÃƒÂ´ng thÃ¡Â»Æ’ tÃ¡ÂºÂ¡o yÃƒÂªu cÃ¡ÂºÂ§u thanh toÃƒÂ¡n checkout trÃ¡Â»â€¦ do Payment Service khÃƒÂ´ng phÃ¡ÂºÂ£n hÃ¡Â»â€œi. Vui lÃƒÂ²ng thÃ¡Â»Â­ lÃ¡ÂºÂ¡i sau.", e);
                }
            }

            CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking, false);
            response.setPaymentRequired(amountDue.compareTo(BigDecimal.ZERO) > 0 && !checkoutChargesPaid);
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
        BigDecimal serviceTotal = calculateServiceTotal(bookingId);
        BigDecimal rawRefund = (early != null && early.getRefundAmount() != null) ? early.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal invoiceTotal = calculateInvoiceTotal(booking, fee, serviceTotal, rawRefund);
        BigDecimal netSettlement = invoiceTotal.subtract(calculateAmountPaid(booking));
        BigDecimal amountDue = netSettlement.max(BigDecimal.ZERO);
        BigDecimal refundSettlementAmount = netSettlement.compareTo(BigDecimal.ZERO) < 0 ? netSettlement.abs() : BigDecimal.ZERO;
        
        boolean paymentRequired = amountDue.compareTo(BigDecimal.ZERO) > 0;
        boolean refundRequired = refundSettlementAmount.compareTo(BigDecimal.ZERO) > 0;

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

        // When completed immediately, persist an invoice snapshot
        if (booking.getStatus() == BookingStatus.COMPLETED && (bookingInvoiceService != null || invoiceRepository != null)) {
            try {
                BigDecimal roomTotal = money(booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice());
                BigDecimal actualRoomCharge = calculateActualRoomCharge(roomTotal, rawRefund);
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("roomTotal", roomTotal);
                payload.put("actualRoomCharge", actualRoomCharge);
                payload.put("amountPaid", calculateAmountPaid(saved));
                payload.put("remainingRoomAmount", calculateRemainingRoomAmount(saved));
                payload.put("lateFee", fee);
                payload.put("serviceTotal", serviceTotal);
                payload.put("earlyCheckoutAdjustment", rawRefund);
                payload.put("refundSettlementAmount", refundSettlementAmount);
                payload.put("grandTotal", invoiceTotal);
                payload.put("remainingBalance", amountDue);
                if (serviceLineRepository != null) {
                    payload.put("serviceLines", toInvoiceServiceLines(serviceLineRepository.findByBookingId(bookingId)));
                }
                if (bookingInvoiceService != null) {
                    bookingInvoiceService.saveCheckoutInvoice(saved.getId(), invoiceTotal, saved.getCurrency(), payload);
                } else {
                    iuh.fit.hotelsystem_booking.entity.BookingInvoice inv = new iuh.fit.hotelsystem_booking.entity.BookingInvoice();
                    inv.setBookingId(saved.getId());
                    inv.setAmount(invoiceTotal);
                    inv.setCurrency(saved.getCurrency() != null ? saved.getCurrency() : "VND");
                    inv.setLinesJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload));
                    inv.setCreatedAt(java.time.LocalDateTime.now());
                    invoiceRepository.save(inv);
                }
            } catch (Exception ex) {
                log.warn("Could not persist invoice for booking {}: {}", bookingId, ex.getMessage());
            }
        }

        if (!paymentRequired && refundRequired && refundService != null && request.getStaffId() != null) {
            try {
                refundService.createAssignedEarlyCheckoutRefundTransaction(saved, refundSettlementAmount, request.getStaffId());
            } catch (Exception ex) {
                log.warn("Could not create automatic early checkout refund for booking {}: {}", bookingId, ex.getMessage());
            }
        }

        if (paymentRequired) {
            try {
                iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest lateReq = new iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest();
                lateReq.setBookingId(bookingId);
                lateReq.setUserId(booking.getUserId());
                lateReq.setAmount(amountDue.doubleValue());
                paymentServiceClient.requestLateCheckoutFeePayment(bookingId, lateCheckoutFeeIdempotencyKey(bookingId, amountDue.doubleValue()), lateReq);
            } catch (Exception e) {
                throw new IllegalStateException("KhÃ´ng thá»ƒ táº¡o yÃªu cáº§u thanh toÃ¡n checkout trá»… do Payment Service khÃ´ng pháº£n há»“i. Vui lÃ²ng thá»­ láº¡i sau.", e);
            }
        }

        try {
            // Khi báº¯t Ä‘áº§u checkout (ká»ƒ cáº£ cÃ³ phÃ­ trá»… hay khÃ´ng), khÃ¡ch rá»i phÃ²ng nÃªn luÃ´n dá»n dáº¹p vÃ  Ä‘áº·t CLEANING láº­p tá»©c
            scheduledService.initCleaningTimer(saved);
            saved = bookingRepository.save(saved); // LÆ°u láº¡i cleaningStartAt vÃ  cleaningEndAt
            for (iuh.fit.hotelsystem_booking.entity.BookingItem item : saved.getItems()) {
                setRoomStatus(item.getRoomId(), "CLEANING");
            }
        } catch (Exception e) {
            log.error("Post-checkout processing failed for booking {}: {}", saved.getId(), e.getMessage());
        }

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, saved.getStatus(), lateMinutes, fee, early, booking, false);
        response.setPaymentRequired(paymentRequired);
        applyRepresentativeToResponse(response, rep);
        return response;
    }

    private LocalDateTime resolveLockedCheckoutAt(Booking booking, BookingStay stay) {
        if (stay != null && stay.getActualCheckOutAt() != null) {
            return stay.getActualCheckOutAt();
        }
        return booking != null ? booking.getActualCheckOutAt() : null;
    }

    private String lateCheckoutFeeIdempotencyKey(Long bookingId, Double amount) {
        return "booking:" + bookingId + ":late-checkout-fee:" + Math.round(amount != null ? amount : 0.0);
    }

    @Transactional
    public Booking completeCheckout(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        BookingStay stay = bookingStayRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new IllegalStateException("Checkout has not been started for booking: " + bookingId));

        BigDecimal lateFee = stay.getLateCheckoutFee() != null ? stay.getLateCheckoutFee() : BigDecimal.ZERO;
        BigDecimal serviceTotal = calculateServiceTotal(bookingId);
        BigDecimal refundAmount = stay.getRefundAmount() != null ? stay.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal invoiceTotal = calculateInvoiceTotal(booking, lateFee, serviceTotal, refundAmount);
        BigDecimal amountDue = invoiceTotal.subtract(calculateAmountPaid(booking)).max(BigDecimal.ZERO);
        if (amountDue.compareTo(BigDecimal.ZERO) > 0) {
            iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse status = paymentServiceClient.getLateCheckoutFeeStatus(bookingId);
            if (status == null || (!"PAID".equalsIgnoreCase(status.getStatus()) && !"SUCCESS".equalsIgnoreCase(status.getStatus()))) {
                throw new IllegalStateException("Checkout charges are not PAID");
            }
            stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.PAID);
            bookingStayRepository.save(stay);
            booking.setPaidAmount(invoiceTotal.doubleValue());
            booking.setPaymentStatus("PAID");
            amountDue = BigDecimal.ZERO;
        }

        if (booking.getActualCheckOutAt() == null && stay.getActualCheckOutAt() != null) {
            booking.setActualCheckOutAt(stay.getActualCheckOutAt());
        }

        booking.setStatus(BookingStatus.COMPLETED);
        Booking saved = bookingRepository.save(booking);
        try {
            scheduledService.initCleaningTimer(saved);
            saved = bookingRepository.save(saved);
            if (saved.getItems() != null) {
                for (var item : saved.getItems()) {
                    setRoomStatus(item.getRoomId(), "CLEANING");
                }
            }
        } catch (Exception e) {
            log.error("Post-checkout completion processing failed for booking {}: {}", saved.getId(), e.getMessage());
        }
        publishBookingEvent(saved, "BookingCompletedEvent");

        // Persist invoice on completion
        if (bookingInvoiceService != null || invoiceRepository != null) {
            try {
                java.math.BigDecimal roomTotal = money(saved.getFinalTotal() != null ? saved.getFinalTotal() : saved.getTotalPrice());
                java.math.BigDecimal actualRoomCharge = calculateActualRoomCharge(roomTotal, refundAmount);
                java.math.BigDecimal amount = actualRoomCharge.add(lateFee != null ? lateFee : java.math.BigDecimal.ZERO).add(serviceTotal);
                java.math.BigDecimal refundSettlementAmount = calculateAmountPaid(saved).subtract(amount).max(java.math.BigDecimal.ZERO);
                java.util.List<iuh.fit.hotelsystem_booking.entity.BookingServiceLine> lines = java.util.Collections.emptyList();
                if (serviceLineRepository != null) lines = serviceLineRepository.findByBookingId(bookingId);
                java.util.Map<String, Object> payload = new java.util.HashMap<>();
                payload.put("roomTotal", roomTotal);
                payload.put("actualRoomCharge", actualRoomCharge);
                payload.put("amountPaid", calculateAmountPaid(saved));
                payload.put("remainingRoomAmount", calculateRemainingRoomAmount(saved));
                payload.put("lateFee", lateFee);
                payload.put("serviceTotal", serviceTotal);
                payload.put("earlyCheckoutAdjustment", refundAmount);
                payload.put("refundSettlementAmount", refundSettlementAmount);
                payload.put("grandTotal", amount);
                payload.put("remainingBalance", amountDue);
                payload.put("serviceLines", toInvoiceServiceLines(lines));
                if (bookingInvoiceService != null) {
                    bookingInvoiceService.saveCheckoutInvoice(bookingId, amount, saved.getCurrency(), payload);
                } else {
                    iuh.fit.hotelsystem_booking.entity.BookingInvoice inv = new iuh.fit.hotelsystem_booking.entity.BookingInvoice();
                    inv.setBookingId(bookingId);
                    inv.setAmount(amount);
                    inv.setCurrency(saved.getCurrency() != null ? saved.getCurrency() : "VND");
                    inv.setLinesJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload));
                    inv.setCreatedAt(java.time.LocalDateTime.now());
                    invoiceRepository.save(inv);
                }
            } catch (Exception ex) {
                log.warn("Could not persist invoice on completeCheckout for {}: {}", bookingId, ex.getMessage());
            }
        }
        return saved;
    }

    private List<Map<String, Object>> toInvoiceServiceLines(List<iuh.fit.hotelsystem_booking.entity.BookingServiceLine> lines) {
        if (lines == null || lines.isEmpty()) return Collections.emptyList();
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (var line : lines) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", line.getId());
            item.put("name", line.getName());
            item.put("quantity", line.getQuantity());
            item.put("unitPrice", line.getUnitPrice());
            item.put("lineTotal", line.getLineTotal());
            result.add(item);
        }
        return result;
    }

    private void setRoomStatus(Long roomId, String status) {
        if (roomId == null) return;
        RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
        dto.setRoomId(roomId);
        dto.setStatus(status);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.status", dto);
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

        // Load service lines and compute service total if repository is available
        BigDecimal serviceTotal = BigDecimal.ZERO;
        java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> serviceDtos = java.util.Collections.emptyList();
        if (serviceLineRepository != null) {
            try {
                java.util.List<iuh.fit.hotelsystem_booking.entity.BookingServiceLine> lines = serviceLineRepository.findByBookingId(bookingId);
                serviceDtos = new java.util.ArrayList<>();
                for (iuh.fit.hotelsystem_booking.entity.BookingServiceLine l : lines) {
                    iuh.fit.hotelsystem_booking.dto.ServiceLineDto dto = new iuh.fit.hotelsystem_booking.dto.ServiceLineDto();
                    dto.setId(l.getId());
                    dto.setBookingId(l.getBookingId());
                    dto.setName(l.getName());
                    dto.setQuantity(l.getQuantity());
                    dto.setUnitPrice(l.getUnitPrice());
                    dto.setLineTotal(l.getLineTotal());
                    serviceDtos.add(dto);
                    if (l.getLineTotal() != null) serviceTotal = serviceTotal.add(l.getLineTotal());
                }
            } catch (Exception e) {
                log.warn("Could not load service lines for booking {}: {}", bookingId, e.getMessage());
            }
        }

        BigDecimal roomCharge = money(booking != null ? (booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice()) : null);
        BigDecimal actualRoomCharge = calculateActualRoomCharge(roomCharge, rawRefund);
        BigDecimal taxAmount = money(booking != null ? booking.getTaxAmount() : null);
        BigDecimal discountAmount = money(booking != null ? booking.getDiscountTotal() : null);
        BigDecimal amountPaid = calculateAmountPaid(booking);
        BigDecimal remainingRoomAmount = calculateRemainingRoomAmount(booking);
        BigDecimal grandTotal = actualRoomCharge.add(fee).add(serviceTotal);
        BigDecimal finalAmount = grandTotal.subtract(amountPaid);
        BigDecimal remainingBalance = finalAmount.max(BigDecimal.ZERO);
        BigDecimal refundSettlementAmount = finalAmount.compareTo(BigDecimal.ZERO) < 0 ? finalAmount.abs() : BigDecimal.ZERO;
        
        boolean paymentRequired = remainingBalance.compareTo(BigDecimal.ZERO) > 0;
        boolean refundRequired = refundSettlementAmount.compareTo(BigDecimal.ZERO) > 0;

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
        response.setServiceTotal(serviceTotal);
        response.setRoomCharge(roomCharge);
        response.setActualRoomCharge(actualRoomCharge);
        response.setTaxAmount(taxAmount);
        response.setDiscountAmount(discountAmount);
        response.setGrandTotal(grandTotal);
        response.setAmountPaid(amountPaid);
        response.setRemainingRoomAmount(remainingRoomAmount);
        response.setRemainingBalance(remainingBalance);
        response.setRefundSettlementAmount(refundSettlementAmount);
        response.setPaymentStatus(resolvePaymentStatus(remainingBalance, amountPaid, roomCharge, refundSettlementAmount));
        response.setServiceLines(serviceDtos);
        response.setPaymentRequired(paymentRequired);
        response.setRefundRequired(refundRequired);
        response.setCheckoutType(resolveCheckoutType(earlyCheckout, fee));
        
        if (booking != null && booking.getRatePlan() != null) {
            response.setRateType(booking.getRatePlan().name());
        }
        bookingStayRepository.findByBookingId(bookingId).ifPresent(stay -> {
            response.setCheckedInByStaffId(stay.getCheckedInByStaffId());
            response.setCheckedOutByStaffId(stay.getCheckedOutByStaffId());
        });
        response.setMessage(buildMessage(response, booking, preview));
        return response;
    }

    private BigDecimal calculateServiceTotal(Long bookingId) {
        if (serviceLineRepository == null) {
            return BigDecimal.ZERO;
        }
        try {
            BigDecimal total = BigDecimal.ZERO;
            for (iuh.fit.hotelsystem_booking.entity.BookingServiceLine line : serviceLineRepository.findByBookingId(bookingId)) {
                if (line.getLineTotal() != null) {
                    total = total.add(line.getLineTotal());
                }
            }
            return total;
        } catch (Exception e) {
            log.warn("Could not calculate service total for booking {}: {}", bookingId, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    private BigDecimal calculateAmountPaid(Booking booking) {
        if (booking == null) return BigDecimal.ZERO;
        return money(booking.getPaidAmount());
    }

    private BigDecimal calculateRemainingRoomAmount(Booking booking) {
        if (booking == null) return BigDecimal.ZERO;
        BigDecimal roomCharge = money(booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice());
        return roomCharge.subtract(calculateAmountPaid(booking)).max(BigDecimal.ZERO);
    }

    private BigDecimal calculateActualRoomCharge(BigDecimal roomCharge, BigDecimal earlyCheckoutAdjustment) {
        BigDecimal charge = roomCharge != null ? roomCharge : BigDecimal.ZERO;
        BigDecimal adjustment = earlyCheckoutAdjustment != null ? earlyCheckoutAdjustment : BigDecimal.ZERO;
        return charge.subtract(adjustment).max(BigDecimal.ZERO);
    }

    private BigDecimal calculateInvoiceTotal(Booking booking, BigDecimal lateFee, BigDecimal serviceTotal, BigDecimal earlyCheckoutAdjustment) {
        BigDecimal roomCharge = money(booking != null ? (booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice()) : null);
        return calculateActualRoomCharge(roomCharge, earlyCheckoutAdjustment)
                .add(lateFee != null ? lateFee : BigDecimal.ZERO)
                .add(serviceTotal != null ? serviceTotal : BigDecimal.ZERO);
    }

    private BigDecimal money(Double value) {
        return BigDecimal.valueOf(value != null ? value : 0.0);
    }

    private String resolvePaymentStatus(BigDecimal remainingBalance, BigDecimal amountPaid, BigDecimal roomCharge, BigDecimal refundSettlementAmount) {
        if (refundSettlementAmount != null && refundSettlementAmount.compareTo(BigDecimal.ZERO) > 0) {
            return "REFUNDED";
        }
        if (remainingBalance == null || remainingBalance.compareTo(BigDecimal.ZERO) <= 0) {
            return "PAID";
        }
        if (amountPaid != null && amountPaid.compareTo(BigDecimal.ZERO) > 0 && roomCharge != null && roomCharge.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY_PAID";
        }
        return "UNPAID";
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
        return actualCheckOutAt.isBefore(officialCheckOutAt) ? 0 : (int) Math.max(minutes, 1);
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
