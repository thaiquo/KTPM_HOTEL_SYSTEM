package iuh.fit.hotelsystem_booking.service;

import org.springframework.stereotype.Service;

@Service
public class VnpayPaymentGateway implements PaymentGateway {

    @Override
    public PaymentGateway.GatewayRefundResult refund(String transactionId, double amount, String idempotencyKey) {
        throw new UnsupportedOperationException("VNPAY Refund API integration is not enabled in demo mode");
    }
}
