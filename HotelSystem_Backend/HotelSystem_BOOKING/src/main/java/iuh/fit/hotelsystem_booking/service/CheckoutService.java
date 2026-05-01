package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.PaymentClient;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.entity.CheckoutType;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.LateCheckoutPaymentStatus;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;

@Service
public class CheckoutService {

    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final CheckInOutService checkInOutService;
    private final RefundCalculationService refundCalculationService;
    private final RabbitTemplate rabbitTemplate;
    private final PaymentClient paymentClient;
    private final Clock clock;

    public CheckoutService(BookingRepository bookingRepository,
                           BookingStayRepository bookingStayRepository,
                           CheckInOutService checkInOutService,
                           RefundCalculationService refundCalculationService,
                           RabbitTemplate rabbitTemplate,
                           PaymentClient paymentClient,
                           ObjectProvider<Clock> clockProvider) {
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
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

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, booking.getStatus(), lateMinutes, lateFee, early, booking);
        applyRepresentative(response, stay);
        return response;
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

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElseGet(BookingStay::new);
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

        if (early.getRefundAmount() != null && early.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
            booking.setPaymentStatus(BookingConstants.PAYMENT_STATUS_REFUND_PENDING);
            paymentClient.requestEarlyCheckoutRefund(bookingId, booking.getUserId(), early.getRefundAmount());
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

        CheckoutResponse response = buildResponse(bookingId, actualCheckOutAt, saved.getStatus(), lateMinutes, lateFee, early, booking);
        response.setPaymentRequired(paymentRequired);
        applyRepresentative(response, stay);
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
                                          Booking booking) {
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
        response.setPaymentRequired(lateFee != null && lateFee.compareTo(BigDecimal.ZERO) > 0);
        response.setCheckoutType(resolveCheckoutType(early.isEarlyCheckout(), lateFee));
        response.setFinalAmount(resolveFinalAmount(lateFee, early.getRefundAmount()));
        response.setRoomNextStatus(null);
        response.setMessage(buildMessage(response, booking));
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

    private String buildMessage(CheckoutResponse response, Booking booking) {
        if (response == null) return null;
        if (response.isPaymentRequired()) {
            return "Late checkout fee payment is required to complete checkout.";
        }
        if (booking != null && booking.getPaymentStatus() != null
                && BookingConstants.PAYMENT_STATUS_REFUND_PENDING.equalsIgnoreCase(booking.getPaymentStatus())) {
            return "Early checkout refund request has been created and is pending.";
        }
        return "Checkout calculated successfully.";
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

    private void applyRepresentative(CheckoutResponse response, BookingStay stay) {
        if (response == null || stay == null) {
            return;
        }
        response.setRepresentativeGuestId(stay.getRepresentativeGuestId());
        response.setRepresentativeFullName(stay.getRepresentativeFullName());
        response.setRepresentativePhone(stay.getRepresentativePhone());
        response.setRepresentativeCccd(stay.getRepresentativeCccd());
    }
}
