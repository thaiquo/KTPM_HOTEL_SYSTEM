package iuh.fit.hotelsystem_booking.service;

public interface PaymentGateway {

    GatewayRefundResult refund(String transactionId, double amount, String idempotencyKey);

    record GatewayRefundResult(boolean success, String message, String gatewayRefundTransactionId) {}
}
