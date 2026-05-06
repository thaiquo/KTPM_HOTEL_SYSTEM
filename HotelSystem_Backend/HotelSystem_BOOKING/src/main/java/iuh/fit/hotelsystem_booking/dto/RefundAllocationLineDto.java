package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;

/** Mirrors Payment Service preview JSON for checkout UI. */
public class RefundAllocationLineDto {

    private BigDecimal amount;
    private String receiverType;
    private Long receiverUserId;
    private Long receiverGuestId;
    private String receiverName;
    private String receiverPhone;
    private String sourcePaymentPurpose;
    private String refundChannel;
    private String recipientSummaryVi;

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getReceiverType() {
        return receiverType;
    }

    public void setReceiverType(String receiverType) {
        this.receiverType = receiverType;
    }

    public Long getReceiverUserId() {
        return receiverUserId;
    }

    public void setReceiverUserId(Long receiverUserId) {
        this.receiverUserId = receiverUserId;
    }

    public Long getReceiverGuestId() {
        return receiverGuestId;
    }

    public void setReceiverGuestId(Long receiverGuestId) {
        this.receiverGuestId = receiverGuestId;
    }

    public String getReceiverName() {
        return receiverName;
    }

    public void setReceiverName(String receiverName) {
        this.receiverName = receiverName;
    }

    public String getReceiverPhone() {
        return receiverPhone;
    }

    public void setReceiverPhone(String receiverPhone) {
        this.receiverPhone = receiverPhone;
    }

    public String getSourcePaymentPurpose() {
        return sourcePaymentPurpose;
    }

    public void setSourcePaymentPurpose(String sourcePaymentPurpose) {
        this.sourcePaymentPurpose = sourcePaymentPurpose;
    }

    public String getRefundChannel() {
        return refundChannel;
    }

    public void setRefundChannel(String refundChannel) {
        this.refundChannel = refundChannel;
    }

    public String getRecipientSummaryVi() {
        return recipientSummaryVi;
    }

    public void setRecipientSummaryVi(String recipientSummaryVi) {
        this.recipientSummaryVi = recipientSummaryVi;
    }
}
