package iuh.fit.hotelsystem_booking.dto;

/**
 * Input request để tính giá phòng (preview trước khi đặt).
 */
public class PricingRequest {

    private String checkInDate;   // yyyy-MM-dd
    private String checkOutDate;  // yyyy-MM-dd
    private double pricePerNight;
    private String ratePlan;

    public String getCheckInDate() { return checkInDate; }
    public void setCheckInDate(String checkInDate) { this.checkInDate = checkInDate; }

    public String getCheckOutDate() { return checkOutDate; }
    public void setCheckOutDate(String checkOutDate) { this.checkOutDate = checkOutDate; }

    public double getPricePerNight() { return pricePerNight; }
    public void setPricePerNight(double pricePerNight) { this.pricePerNight = pricePerNight; }

    public String getRatePlan() { return ratePlan; }
    public void setRatePlan(String ratePlan) { this.ratePlan = ratePlan; }
}
