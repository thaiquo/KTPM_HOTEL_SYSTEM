package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDate;

public class BookingModificationRequest {
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Double pricePerNight;
    private String notes;

    public LocalDate getCheckIn() { return checkIn; }
    public void setCheckIn(LocalDate checkIn) { this.checkIn = checkIn; }

    public LocalDate getCheckOut() { return checkOut; }
    public void setCheckOut(LocalDate checkOut) { this.checkOut = checkOut; }

    public Double getPricePerNight() { return pricePerNight; }
    public void setPricePerNight(Double pricePerNight) { this.pricePerNight = pricePerNight; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
