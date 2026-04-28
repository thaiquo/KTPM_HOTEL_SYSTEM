package iuh.fit.hotelsystem_booking.dto;

/**
 * Kết quả tính giá phòng từ PricingService.
 */
public class PricingResult {

    private int nights;
    private boolean isHolidayBooking;
    private String appliedRule;       // "NORMAL" | "HOLIDAY"
    private double pricePerNight;
    private double baseTotal;
    private double priceMultiplier;
    private double finalTotal;
    private int depositPercent;
    private double depositAmount;
    private int freeCancelBeforeHours;
    private int minStayNights;
    private String ratePlan;
    private int discountPercent;
    private boolean refundable;
    private String paymentType;
    private boolean allowModification;

    // ════════════════════════════════════════════════════════════
    // Getters / Setters
    // ════════════════════════════════════════════════════════════

    public int getNights() { return nights; }
    public void setNights(int nights) { this.nights = nights; }

    public boolean isHolidayBooking() { return isHolidayBooking; }
    public void setHolidayBooking(boolean holidayBooking) { isHolidayBooking = holidayBooking; }

    public String getAppliedRule() { return appliedRule; }
    public void setAppliedRule(String appliedRule) { this.appliedRule = appliedRule; }

    public double getPricePerNight() { return pricePerNight; }
    public void setPricePerNight(double pricePerNight) { this.pricePerNight = pricePerNight; }

    public double getBaseTotal() { return baseTotal; }
    public void setBaseTotal(double baseTotal) { this.baseTotal = baseTotal; }

    public double getPriceMultiplier() { return priceMultiplier; }
    public void setPriceMultiplier(double priceMultiplier) { this.priceMultiplier = priceMultiplier; }

    public double getFinalTotal() { return finalTotal; }
    public void setFinalTotal(double finalTotal) { this.finalTotal = finalTotal; }

    public int getDepositPercent() { return depositPercent; }
    public void setDepositPercent(int depositPercent) { this.depositPercent = depositPercent; }

    public double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(double depositAmount) { this.depositAmount = depositAmount; }

    public int getFreeCancelBeforeHours() { return freeCancelBeforeHours; }
    public void setFreeCancelBeforeHours(int freeCancelBeforeHours) { this.freeCancelBeforeHours = freeCancelBeforeHours; }

    public int getMinStayNights() { return minStayNights; }
    public void setMinStayNights(int minStayNights) { this.minStayNights = minStayNights; }

    public String getRatePlan() { return ratePlan; }
    public void setRatePlan(String ratePlan) { this.ratePlan = ratePlan; }

    public int getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(int discountPercent) { this.discountPercent = discountPercent; }

    public boolean isRefundable() { return refundable; }
    public void setRefundable(boolean refundable) { this.refundable = refundable; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public boolean isAllowModification() { return allowModification; }
    public void setAllowModification(boolean allowModification) { this.allowModification = allowModification; }
}
