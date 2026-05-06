package iuh.fit.hotelsystem_payment.dto;

public class CheckinQrRequest {
    private Long bookingId;
    private Double amount;
    private String method;
    private String type;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
