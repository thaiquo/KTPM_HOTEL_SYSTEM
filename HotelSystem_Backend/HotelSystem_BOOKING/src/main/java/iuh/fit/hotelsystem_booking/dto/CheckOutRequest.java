package iuh.fit.hotelsystem_booking.dto;

public class CheckOutRequest {
    private Long staffId;
    private Boolean lateCheckoutPaymentCollected;
    private String earlyCheckoutReason;

    /** Guest/representative verifying at desk — must match check-in data unless {@link #verificationOverride}. */
    private String verifierFullName;
    private String verifierPhone;
    private String verifierCccd;

    private Boolean verificationOverride;
    private String overrideReason;

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public Boolean getLateCheckoutPaymentCollected() { return lateCheckoutPaymentCollected; }
    public void setLateCheckoutPaymentCollected(Boolean lateCheckoutPaymentCollected) {
        this.lateCheckoutPaymentCollected = lateCheckoutPaymentCollected;
    }

    public String getEarlyCheckoutReason() { return earlyCheckoutReason; }
    public void setEarlyCheckoutReason(String earlyCheckoutReason) { this.earlyCheckoutReason = earlyCheckoutReason; }

    public String getVerifierFullName() { return verifierFullName; }
    public void setVerifierFullName(String verifierFullName) { this.verifierFullName = verifierFullName; }

    public String getVerifierPhone() { return verifierPhone; }
    public void setVerifierPhone(String verifierPhone) { this.verifierPhone = verifierPhone; }

    public String getVerifierCccd() { return verifierCccd; }
    public void setVerifierCccd(String verifierCccd) { this.verifierCccd = verifierCccd; }

    public Boolean getVerificationOverride() { return verificationOverride; }
    public void setVerificationOverride(Boolean verificationOverride) { this.verificationOverride = verificationOverride; }

    public String getOverrideReason() { return overrideReason; }
    public void setOverrideReason(String overrideReason) { this.overrideReason = overrideReason; }
}
