package iuh.fit.hotelsystem_booking.dto;

import iuh.fit.hotelsystem_booking.entity.Booking;

import java.math.BigDecimal;

public class RoomChangeResponse {
    private Long bookingId;
    private Long fromRoomId;
    private Long toRoomId;
    private Integer remainingNights;
    private BigDecimal oldNightlyPrice;
    private BigDecimal newNightlyPrice;
    private BigDecimal priceDifferencePerNight;
    private BigDecimal totalDifference;
    private String paymentAction;
    private String oldRoomNextStatus;
    private Booking booking;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getFromRoomId() { return fromRoomId; }
    public void setFromRoomId(Long fromRoomId) { this.fromRoomId = fromRoomId; }

    public Long getToRoomId() { return toRoomId; }
    public void setToRoomId(Long toRoomId) { this.toRoomId = toRoomId; }

    public Integer getRemainingNights() { return remainingNights; }
    public void setRemainingNights(Integer remainingNights) { this.remainingNights = remainingNights; }

    public BigDecimal getOldNightlyPrice() { return oldNightlyPrice; }
    public void setOldNightlyPrice(BigDecimal oldNightlyPrice) { this.oldNightlyPrice = oldNightlyPrice; }

    public BigDecimal getNewNightlyPrice() { return newNightlyPrice; }
    public void setNewNightlyPrice(BigDecimal newNightlyPrice) { this.newNightlyPrice = newNightlyPrice; }

    public BigDecimal getPriceDifferencePerNight() { return priceDifferencePerNight; }
    public void setPriceDifferencePerNight(BigDecimal priceDifferencePerNight) { this.priceDifferencePerNight = priceDifferencePerNight; }

    public BigDecimal getTotalDifference() { return totalDifference; }
    public void setTotalDifference(BigDecimal totalDifference) { this.totalDifference = totalDifference; }

    public String getPaymentAction() { return paymentAction; }
    public void setPaymentAction(String paymentAction) { this.paymentAction = paymentAction; }

    public String getOldRoomNextStatus() { return oldRoomNextStatus; }
    public void setOldRoomNextStatus(String oldRoomNextStatus) { this.oldRoomNextStatus = oldRoomNextStatus; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }
}
