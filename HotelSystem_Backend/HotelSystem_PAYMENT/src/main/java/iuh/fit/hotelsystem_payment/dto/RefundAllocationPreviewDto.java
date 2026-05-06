package iuh.fit.hotelsystem_payment.dto;

import java.math.BigDecimal;

/**
 * Preview-only: ai nhận hoàn, từ khoản thanh toán nào (chưa ghi DB).
 */
public class RefundAllocationPreviewDto {

    private BigDecimal amount;
    private String receiverType;
    private Long receiverUserId;
    private Long receiverGuestId;
    private String receiverName;
    private String receiverPhone;
    /** REMAINING, DEPOSIT, FULL_PAYMENT, CHECKIN_REMAINING */
    private String sourcePaymentPurpose;
    /** VNPAY_REFUND, CASH, BANK_TRANSFER, … */
    private String refundChannel;
    /** Một dòng mô tả đầy đủ cho UI */
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
