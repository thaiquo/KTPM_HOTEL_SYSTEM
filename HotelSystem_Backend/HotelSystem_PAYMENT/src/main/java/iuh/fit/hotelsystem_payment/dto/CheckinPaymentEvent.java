package iuh.fit.hotelsystem_payment.dto;

public class CheckinPaymentEvent {
    private String paymentCode;
    private Long bookingId;
    private Double amount;
    private String status;
    private String checkinStatus;

    public CheckinPaymentEvent() {
    }

    public CheckinPaymentEvent(String paymentCode, Long bookingId, Double amount, String status, String checkinStatus) {
        this.paymentCode = paymentCode;
        this.bookingId = bookingId;
        this.amount = amount;
        this.status = status;
        this.checkinStatus = checkinStatus;
    }

    public String getPaymentCode() { return paymentCode; }
    public void setPaymentCode(String paymentCode) { this.paymentCode = paymentCode; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCheckinStatus() { return checkinStatus; }
    public void setCheckinStatus(String checkinStatus) { this.checkinStatus = checkinStatus; }
}
