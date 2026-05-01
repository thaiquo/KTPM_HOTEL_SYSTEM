package iuh.fit.hotelsystem_booking.client;

import java.math.BigDecimal;

public interface PaymentClient {
    void requestLateCheckoutFeePayment(Long bookingId, Long userId, BigDecimal amount);

    void requestEarlyCheckoutRefund(Long bookingId, Long userId, BigDecimal refundAmount);

    boolean isLateCheckoutFeePaid(Long bookingId);
}
