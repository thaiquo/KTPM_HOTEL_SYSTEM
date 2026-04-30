package iuh.fit.hotelsystem_payment.dto;

public class MoMoResponse {
    private String paymentUrl;

    public MoMoResponse() {
    }

    public MoMoResponse(String paymentUrl) {
        this.paymentUrl = paymentUrl;
    }

    public String getPaymentUrl() {
        return paymentUrl;
    }

    public void setPaymentUrl(String paymentUrl) {
        this.paymentUrl = paymentUrl;
    }
}
