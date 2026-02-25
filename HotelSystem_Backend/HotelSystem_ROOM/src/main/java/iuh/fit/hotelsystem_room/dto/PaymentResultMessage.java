package iuh.fit.hotelsystem_room.dto;

public class PaymentResultMessage {

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

