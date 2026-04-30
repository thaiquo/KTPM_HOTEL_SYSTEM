package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;

public class CheckoutResponse {
    private Long bookingId;
    private Integer lateMinutes;
    private BigDecimal lateCheckoutFee;
    private boolean paymentRequired;
    private String bookingStatus;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Integer getLateMinutes() { return lateMinutes; }
    public void setLateMinutes(Integer lateMinutes) { this.lateMinutes = lateMinutes; }

    public BigDecimal getLateCheckoutFee() { return lateCheckoutFee; }
    public void setLateCheckoutFee(BigDecimal lateCheckoutFee) { this.lateCheckoutFee = lateCheckoutFee; }

    public boolean isPaymentRequired() { return paymentRequired; }
    public void setPaymentRequired(boolean paymentRequired) { this.paymentRequired = paymentRequired; }

    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }
}
