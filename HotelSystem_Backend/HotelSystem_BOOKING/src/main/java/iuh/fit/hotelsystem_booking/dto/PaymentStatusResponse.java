package iuh.fit.hotelsystem_booking.dto;

public class PaymentStatusResponse {
    private String status;
    private Double paidAmount;
    private Double remainingAmount;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }

    public Double getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(Double remainingAmount) { this.remainingAmount = remainingAmount; }
}
