package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;

public class EarlyCheckoutRefundResult {
    private boolean earlyCheckout;
    private int totalNights;
    private int usedNights;
    private int chargeNights;
    private int unusedNights;
    private BigDecimal refundRate;
    private BigDecimal refundAmount;

    public boolean isEarlyCheckout() { return earlyCheckout; }
    public void setEarlyCheckout(boolean earlyCheckout) { this.earlyCheckout = earlyCheckout; }

    public int getTotalNights() { return totalNights; }
    public void setTotalNights(int totalNights) { this.totalNights = totalNights; }

    public int getUsedNights() { return usedNights; }
    public void setUsedNights(int usedNights) { this.usedNights = usedNights; }

    public int getChargeNights() { return chargeNights; }
    public void setChargeNights(int chargeNights) { this.chargeNights = chargeNights; }

    public int getUnusedNights() { return unusedNights; }
    public void setUnusedNights(int unusedNights) { this.unusedNights = unusedNights; }

    public BigDecimal getRefundRate() { return refundRate; }
    public void setRefundRate(BigDecimal refundRate) { this.refundRate = refundRate; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }
}

