package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class CheckoutResponse {
    private Long bookingId;
    private String checkoutType;
    /** FLEXIBLE | NON_REFUNDABLE — mirrors rate plan for clients */
    private String rateType;
    private Integer totalNights;
    private Integer lateMinutes;
    private BigDecimal lateCheckoutFee;
    private BigDecimal lateFee;

    private boolean earlyCheckout;
    private Integer usedNights;
    private Integer chargeNights;
    private Integer unusedNights;
    private BigDecimal refundRate;
    private BigDecimal refundAmount;
    private BigDecimal effectivePricePerNight;

    private BigDecimal finalAmount;
    private BigDecimal serviceTotal;
    private BigDecimal roomCharge;
    private BigDecimal actualRoomCharge;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal grandTotal;
    private BigDecimal amountPaid;
    private BigDecimal remainingRoomAmount;
    private BigDecimal remainingBalance;
    private BigDecimal refundSettlementAmount;
    private String paymentStatus;
    private java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> serviceLines;
    private String roomNextStatus;
    private String message;

    private LocalDateTime actualCheckoutAt;
    private boolean paymentRequired;
    /** True when flexible early checkout yields a positive refundAmount */
    private Boolean refundRequired;
    private String bookingStatus;
    private Long representativeGuestId;
    private String representativeFullName;
    private String representativePhone;
    private String representativeCccd;
    private Long checkedInByStaffId;
    private Long checkedOutByStaffId;
    private boolean immediateRefund;

    /** Preview phân bổ hoàn tiền theo người đã thanh toán (Payment Service). */
    private List<RefundAllocationLineDto> refundAllocations;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Integer getLateMinutes() { return lateMinutes; }
    public void setLateMinutes(Integer lateMinutes) { this.lateMinutes = lateMinutes; }

    public BigDecimal getLateCheckoutFee() { return lateCheckoutFee; }
    public void setLateCheckoutFee(BigDecimal lateCheckoutFee) { this.lateCheckoutFee = lateCheckoutFee; }

    public String getCheckoutType() { return checkoutType; }
    public void setCheckoutType(String checkoutType) { this.checkoutType = checkoutType; }

    public String getRateType() { return rateType; }
    public void setRateType(String rateType) { this.rateType = rateType; }

    public Integer getTotalNights() { return totalNights; }
    public void setTotalNights(Integer totalNights) { this.totalNights = totalNights; }

    public BigDecimal getLateFee() { return lateFee != null ? lateFee : lateCheckoutFee; }
    public void setLateFee(BigDecimal lateFee) { this.lateFee = lateFee; }

    public boolean isEarlyCheckout() { return earlyCheckout; }
    public void setEarlyCheckout(boolean earlyCheckout) { this.earlyCheckout = earlyCheckout; }

    public Integer getUsedNights() { return usedNights; }
    public void setUsedNights(Integer usedNights) { this.usedNights = usedNights; }

    public Integer getChargeNights() { return chargeNights; }
    public void setChargeNights(Integer chargeNights) { this.chargeNights = chargeNights; }

    public Integer getUnusedNights() { return unusedNights; }
    public void setUnusedNights(Integer unusedNights) { this.unusedNights = unusedNights; }

    public BigDecimal getRefundRate() { return refundRate; }
    public void setRefundRate(BigDecimal refundRate) { this.refundRate = refundRate; }

    public BigDecimal getRefundAmount() { return refundAmount; }
    public void setRefundAmount(BigDecimal refundAmount) { this.refundAmount = refundAmount; }

    public BigDecimal getEffectivePricePerNight() { return effectivePricePerNight; }
    public void setEffectivePricePerNight(BigDecimal effectivePricePerNight) {
        this.effectivePricePerNight = effectivePricePerNight;
    }

    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal finalAmount) { this.finalAmount = finalAmount; }

    public BigDecimal getServiceTotal() { return serviceTotal != null ? serviceTotal : BigDecimal.ZERO; }
    public void setServiceTotal(BigDecimal serviceTotal) { this.serviceTotal = serviceTotal; }

    public BigDecimal getRoomCharge() { return roomCharge != null ? roomCharge : BigDecimal.ZERO; }
    public void setRoomCharge(BigDecimal roomCharge) { this.roomCharge = roomCharge; }

    public BigDecimal getActualRoomCharge() { return actualRoomCharge != null ? actualRoomCharge : BigDecimal.ZERO; }
    public void setActualRoomCharge(BigDecimal actualRoomCharge) { this.actualRoomCharge = actualRoomCharge; }

    public BigDecimal getTaxAmount() { return taxAmount != null ? taxAmount : BigDecimal.ZERO; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getDiscountAmount() { return discountAmount != null ? discountAmount : BigDecimal.ZERO; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getGrandTotal() { return grandTotal != null ? grandTotal : BigDecimal.ZERO; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }

    public BigDecimal getAmountPaid() { return amountPaid != null ? amountPaid : BigDecimal.ZERO; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public BigDecimal getRemainingRoomAmount() { return remainingRoomAmount != null ? remainingRoomAmount : BigDecimal.ZERO; }
    public void setRemainingRoomAmount(BigDecimal remainingRoomAmount) { this.remainingRoomAmount = remainingRoomAmount; }

    public BigDecimal getRemainingBalance() { return remainingBalance != null ? remainingBalance : finalAmount; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public BigDecimal getRefundSettlementAmount() { return refundSettlementAmount != null ? refundSettlementAmount : BigDecimal.ZERO; }
    public void setRefundSettlementAmount(BigDecimal refundSettlementAmount) { this.refundSettlementAmount = refundSettlementAmount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> getServiceLines() { return serviceLines; }
    public void setServiceLines(java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> serviceLines) { this.serviceLines = serviceLines; }

    public String getRoomNextStatus() { return roomNextStatus; }
    public void setRoomNextStatus(String roomNextStatus) { this.roomNextStatus = roomNextStatus; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getActualCheckoutAt() { return actualCheckoutAt; }
    public void setActualCheckoutAt(LocalDateTime actualCheckoutAt) { this.actualCheckoutAt = actualCheckoutAt; }

    public boolean isPaymentRequired() { return paymentRequired; }
    public void setPaymentRequired(boolean paymentRequired) { this.paymentRequired = paymentRequired; }

    public Boolean getRefundRequired() { return refundRequired; }
    public void setRefundRequired(Boolean refundRequired) { this.refundRequired = refundRequired; }

    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }

    public Long getRepresentativeGuestId() { return representativeGuestId; }
    public void setRepresentativeGuestId(Long representativeGuestId) { this.representativeGuestId = representativeGuestId; }

    public String getRepresentativeFullName() { return representativeFullName; }
    public void setRepresentativeFullName(String representativeFullName) { this.representativeFullName = representativeFullName; }

    public String getRepresentativePhone() { return representativePhone; }
    public void setRepresentativePhone(String representativePhone) { this.representativePhone = representativePhone; }

    public String getRepresentativeCccd() { return representativeCccd; }
    public void setRepresentativeCccd(String representativeCccd) { this.representativeCccd = representativeCccd; }

    public Long getCheckedInByStaffId() { return checkedInByStaffId; }
    public void setCheckedInByStaffId(Long checkedInByStaffId) { this.checkedInByStaffId = checkedInByStaffId; }

    public Long getCheckedOutByStaffId() { return checkedOutByStaffId; }
    public void setCheckedOutByStaffId(Long checkedOutByStaffId) { this.checkedOutByStaffId = checkedOutByStaffId; }

    public boolean isImmediateRefund() { return immediateRefund; }
    public void setImmediateRefund(boolean immediateRefund) { this.immediateRefund = immediateRefund; }

    public List<RefundAllocationLineDto> getRefundAllocations() { return refundAllocations; }
    public void setRefundAllocations(List<RefundAllocationLineDto> refundAllocations) {
        this.refundAllocations = refundAllocations;
    }
}
