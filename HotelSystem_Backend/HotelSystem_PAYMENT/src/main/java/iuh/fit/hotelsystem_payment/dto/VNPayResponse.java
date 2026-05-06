package iuh.fit.hotelsystem_payment.dto;

public class VNPayResponse {
    private String paymentUrl;

    public VNPayResponse() {
    }

    public VNPayResponse(String paymentUrl) {
        this.paymentUrl = paymentUrl;
    }

    public String getPaymentUrl() {
        return paymentUrl;
    }

    public void setPaymentUrl(String paymentUrl) {
        this.paymentUrl = paymentUrl;
    }
}
