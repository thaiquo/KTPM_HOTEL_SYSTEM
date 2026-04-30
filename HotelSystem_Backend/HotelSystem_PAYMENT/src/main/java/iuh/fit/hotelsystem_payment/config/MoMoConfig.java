package iuh.fit.hotelsystem_payment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MoMoConfig {

    @Value("${momo.partnerCode:MOMO}")
    private String partnerCode;

    @Value("${momo.accessKey:F8BBA842ECF85}")
    private String accessKey;

    @Value("${momo.secretKey:K951B6PE1waDMi640xX08PD3vg6EkVlz}")
    private String secretKey;

    @Value("${momo.payUrl:https://test-payment.momo.vn/v2/gateway/api/create}")
    private String payUrl;

    @Value("${momo.redirectUrl:http://localhost:8085/payments/momo-return}")
    private String redirectUrl;

    @Value("${momo.ipnUrl:http://localhost:8085/payments/momo-ipn}")
    private String ipnUrl;

    @Value("${momo.partnerName:HotelSystem}")
    private String partnerName;

    @Value("${momo.storeId:HotelSystemStore}")
    private String storeId;

    @Value("${momo.frontendReturnUrl:http://localhost:3000/payment-result}")
    private String frontendReturnUrl;

    /**
     * Thời gian hết hạn giao dịch MoMo (phút).
     * Giữ đồng bộ với vnpay.expireMinutes và booking.hold-minutes (= expireMinutes + 1).
     */
    @Value("${momo.expireMinutes:10}")
    private int expireMinutes;

    public String getPartnerCode() {
        return partnerCode;
    }

    public String getAccessKey() {
        return accessKey;
    }

    public String getSecretKey() {
        return secretKey;
    }

    public String getPayUrl() {
        return payUrl;
    }

    public String getRedirectUrl() {
        return redirectUrl;
    }

    public String getIpnUrl() {
        return ipnUrl;
    }

    public String getPartnerName() {
        return partnerName;
    }

    public String getStoreId() {
        return storeId;
    }

    public String getFrontendReturnUrl() {
        return frontendReturnUrl;
    }

    public int getExpireMinutes() {
        return expireMinutes;
    }
}
