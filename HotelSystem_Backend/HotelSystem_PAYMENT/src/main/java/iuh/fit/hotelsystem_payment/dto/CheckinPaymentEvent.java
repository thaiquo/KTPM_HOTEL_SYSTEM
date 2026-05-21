package iuh.fit.hotelsystem_payment.dto;

public class CheckinPaymentEvent {
    private String paymentCode;
    private Long bookingId;
    private Double amount;
    private String status;
    private String checkinStatus;
    private Long payerGuestId;
    private String payerName;
    private String payerPhone;
    private String payerCccd;

    public CheckinPaymentEvent() {
    }

    public CheckinPaymentEvent(String paymentCode, Long bookingId, Double amount, String status, String checkinStatus) {
        this(paymentCode, bookingId, amount, status, checkinStatus, null, null);
    }

    public CheckinPaymentEvent(String paymentCode, Long bookingId, Double amount, String status, String checkinStatus, Long payerGuestId, String payerName) {
        this(paymentCode, bookingId, amount, status, checkinStatus, payerGuestId, payerName, null, null);
    }

    public CheckinPaymentEvent(String paymentCode, Long bookingId, Double amount, String status, String checkinStatus, Long payerGuestId, String payerName, String payerPhone, String payerCccd) {
        this.paymentCode = paymentCode;
        this.bookingId = bookingId;
        this.amount = amount;
        this.status = status;
        this.checkinStatus = checkinStatus;
        this.payerGuestId = payerGuestId;
        this.payerName = payerName;
        this.payerPhone = payerPhone;
        this.payerCccd = payerCccd;
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

    public Long getPayerGuestId() { return payerGuestId; }
    public void setPayerGuestId(Long payerGuestId) { this.payerGuestId = payerGuestId; }

    public String getPayerName() { return payerName; }
    public void setPayerName(String payerName) { this.payerName = payerName; }

    public String getPayerPhone() { return payerPhone; }
    public void setPayerPhone(String payerPhone) { this.payerPhone = payerPhone; }

    public String getPayerCccd() { return payerCccd; }
    public void setPayerCccd(String payerCccd) { this.payerCccd = payerCccd; }
}
