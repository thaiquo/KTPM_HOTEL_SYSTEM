package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;

public class BookingRoomExtraFeeRequest {
    private Long bookingRoomId;
    private BigDecimal serviceCharge;
    private BigDecimal surcharge;
    private BigDecimal damageFee;
    private String note;

    public Long getBookingRoomId() { return bookingRoomId; }
    public void setBookingRoomId(Long bookingRoomId) { this.bookingRoomId = bookingRoomId; }

    public BigDecimal getServiceCharge() { return serviceCharge; }
    public void setServiceCharge(BigDecimal serviceCharge) { this.serviceCharge = serviceCharge; }

    public BigDecimal getSurcharge() { return surcharge; }
    public void setSurcharge(BigDecimal surcharge) { this.surcharge = surcharge; }

    public BigDecimal getDamageFee() { return damageFee; }
    public void setDamageFee(BigDecimal damageFee) { this.damageFee = damageFee; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
