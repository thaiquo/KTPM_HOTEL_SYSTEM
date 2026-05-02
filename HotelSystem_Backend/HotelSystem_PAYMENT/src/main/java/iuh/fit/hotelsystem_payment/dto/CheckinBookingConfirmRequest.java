package iuh.fit.hotelsystem_payment.dto;

public class CheckinBookingConfirmRequest {
    private String paymentCode;
    private Double amount;
    private String method;

    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
}
