package iuh.fit.hotelsystem_payment.dto;

import lombok.Data;

//@Data
public class PaymentResult {

    private Long bookingId;
    private String status; // SUCCESS / FAILED

    public Long getBookingId() {
        return bookingId;
    }

    public void setBookingId(Long bookingId) {
        this.bookingId = bookingId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
