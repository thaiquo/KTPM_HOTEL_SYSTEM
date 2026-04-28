package iuh.fit.hotelsystem_booking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Primary
@Service
public class FakePaymentGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(FakePaymentGateway.class);

    @Override
    public GatewayRefundResult refund(String transactionId, double amount, String idempotencyKey) {
        log.info("Simulate refund via VNPAY demo. transactionId={}, amount={}, idempotencyKey={}",
                transactionId, amount, idempotencyKey);
        String refundRequestId = idempotencyKey != null && idempotencyKey.startsWith("refund_")
                ? idempotencyKey.substring("refund_".length())
                : transactionId;
        return new GatewayRefundResult(true, "Simulated VNPAY refund success", "SIMULATED_" + refundRequestId);
    }
}
