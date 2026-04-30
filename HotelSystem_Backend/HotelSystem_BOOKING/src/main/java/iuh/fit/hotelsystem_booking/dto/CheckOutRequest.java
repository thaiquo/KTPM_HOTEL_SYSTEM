package iuh.fit.hotelsystem_booking.dto;

public class CheckOutRequest {
    private Long staffId;
    private Boolean lateCheckoutPaymentCollected;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Boolean getLateCheckoutPaymentCollected() { return lateCheckoutPaymentCollected; }
    public void setLateCheckoutPaymentCollected(Boolean lateCheckoutPaymentCollected) {
        this.lateCheckoutPaymentCollected = lateCheckoutPaymentCollected;
    }
}
