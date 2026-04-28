package iuh.fit.hotelsystem_payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class VNPayConfig {

    @Value("${vnpay.tmnCode:DEMO}")
    private String tmnCode;

    @Value("${vnpay.hashSecret:DEMO_SECRET}")
    private String hashSecret;

    @Value("${vnpay.payUrl:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${vnpay.returnUrl:http://localhost:8085/payments/vnpay-return}")
    private String returnUrl;

    @Value("${vnpay.frontendReturnUrl:http://localhost:3000/payment-result}")
    private String frontendReturnUrl;

    /**
     * Thời gian hết hạn giao dịch VNPAY (phút).
     * Giữ đồng bộ với booking.hold-minutes trong BOOKING service.
     * VNPAY min = 5 phút. Mặc định 10 phút.
     */
    @Value("${vnpay.expireMinutes:10}")
    private int expireMinutes;

    public String getTmnCode() {
        return tmnCode;
    }

    public String getHashSecret() {
        return hashSecret;
    }

    public String getPayUrl() {
        return payUrl;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public String getFrontendReturnUrl() {
        return frontendReturnUrl;
    }

    public int getExpireMinutes() {
        return expireMinutes;
    }
}
