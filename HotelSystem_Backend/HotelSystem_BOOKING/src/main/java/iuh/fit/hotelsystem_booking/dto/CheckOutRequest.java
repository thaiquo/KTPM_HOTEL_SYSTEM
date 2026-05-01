package iuh.fit.hotelsystem_booking.dto;

public class CheckOutRequest {
    private Long staffId;
    private Boolean lateCheckoutPaymentCollected;
    private String earlyCheckoutReason;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Boolean getLateCheckoutPaymentCollected() { return lateCheckoutPaymentCollected; }
    public void setLateCheckoutPaymentCollected(Boolean lateCheckoutPaymentCollected) {
        this.lateCheckoutPaymentCollected = lateCheckoutPaymentCollected;
    }

    public String getEarlyCheckoutReason() { return earlyCheckoutReason; }
    public void setEarlyCheckoutReason(String earlyCheckoutReason) { this.earlyCheckoutReason = earlyCheckoutReason; }
}
