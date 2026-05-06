package iuh.fit.hotelsystem_payment.dto;

import java.time.LocalDateTime;

public class CheckinQrResponse {
    private String paymentCode;
    private Double amount;
    private String confirmUrl;
    private LocalDateTime expiredAt;

    public CheckinQrResponse() {
    }

    public CheckinQrResponse(String paymentCode, Double amount, String confirmUrl, LocalDateTime expiredAt) {
        this.paymentCode = paymentCode;
        this.amount = amount;
        this.confirmUrl = confirmUrl;
        this.expiredAt = expiredAt;
    }

    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getConfirmUrl() { return confirmUrl; }
    public void setConfirmUrl(String confirmUrl) { this.confirmUrl = confirmUrl; }

    public LocalDateTime getExpiredAt() { return expiredAt; }
    public void setExpiredAt(LocalDateTime expiredAt) { this.expiredAt = expiredAt; }
}
