package iuh.fit.hotelsystem_booking.dto;

import lombok.Data;

@Data
public class CancellationPolicyResult {
    private boolean canCancel;
    private String policyType;   // NORMAL | HOLIDAY | NON_REFUNDABLE
    private String cancelType;   // FREE_CANCEL | LATE_CANCEL | NO_SHOW
    private double paidAmount;
    private double cancellationFee;
    private double refundAmount;
    private String refundStatus; // REFUND_REQUIRED | NO_REFUND | HOTEL_CHARGE
    private String reason;

    // Manual Getters/Setters because Lombok might not be picked up immediately in all environments
    public boolean isCanCancel() { return canCancel; }
    public void setCanCancel(boolean canCancel) { this.canCancel = canCancel; }

    public String getPolicyType() { return policyType; }
    public void setPolicyType(String policyType) { this.policyType = policyType; }

    public String getCancelType() { return cancelType; }
    public void setCancelType(String cancelType) { this.cancelType = cancelType; }

    public double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(double paidAmount) { this.paidAmount = paidAmount; }

    public double getCancellationFee() { return cancellationFee; }
    public void setCancellationFee(double cancellationFee) { this.cancellationFee = cancellationFee; }

    public double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(double refundAmount) { this.refundAmount = refundAmount; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
