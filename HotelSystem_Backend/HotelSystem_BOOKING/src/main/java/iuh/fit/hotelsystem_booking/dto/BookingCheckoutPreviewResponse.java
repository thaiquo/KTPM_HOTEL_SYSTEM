package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class BookingCheckoutPreviewResponse {
    private Long bookingId;
    private String bookingCode;
    private String bookingStatus;
    private String currency;
    private LocalDateTime actualCheckOutAt;
    private Integer selectedRoomCount;
    private List<Long> selectedRoomIds = new ArrayList<>();
    private List<CheckoutRoomSummaryDto> roomSummaries = new ArrayList<>();
    private List<CheckoutInvoiceLineDto> invoiceLines = new ArrayList<>();
    private BigDecimal totalOriginalAmount = BigDecimal.ZERO;
    private BigDecimal totalUsedRoomAmount = BigDecimal.ZERO;
    private BigDecimal totalUnusedRoomAmount = BigDecimal.ZERO;
    private BigDecimal totalHotelKeepAmount = BigDecimal.ZERO;
    private BigDecimal totalAllocatedPaidAmount = BigDecimal.ZERO;
    private BigDecimal totalActualRevenue = BigDecimal.ZERO;
    private BigDecimal totalRefundToCustomer = BigDecimal.ZERO;
    private BigDecimal totalAdditionalCharge = BigDecimal.ZERO;
    private BigDecimal roomCharge = BigDecimal.ZERO;
    private BigDecimal serviceTotal = BigDecimal.ZERO;
    private BigDecimal bookingServiceTotal = BigDecimal.ZERO;
    private BigDecimal draftServiceLinesTotal = BigDecimal.ZERO;
    private BigDecimal roomServiceFeeTotal = BigDecimal.ZERO;
    private BigDecimal manualServiceTotal = BigDecimal.ZERO;
    private BigDecimal damageFeeTotal = BigDecimal.ZERO;
    private BigDecimal manualSurchargeTotal = BigDecimal.ZERO;
    private BigDecimal lateCheckoutFeeTotal = BigDecimal.ZERO;
    private BigDecimal earlyCheckinFeeTotal = BigDecimal.ZERO;
    private BigDecimal earlyCheckoutRefund = BigDecimal.ZERO;
    private BigDecimal actualRoomCharge = BigDecimal.ZERO;
    private BigDecimal grandTotal = BigDecimal.ZERO;
    private BigDecimal amountPaid = BigDecimal.ZERO;
    private BigDecimal remainingBalance = BigDecimal.ZERO;
    private BigDecimal refundSettlementAmount = BigDecimal.ZERO;
    private boolean paymentRequired;
    private boolean refundRequired;
    private String checkoutType;
    private Integer usedNights;
    private Integer unusedNights;
    private BigDecimal refundRate = BigDecimal.ZERO;
    private String message;

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }

    public String getBookingStatus() { return bookingStatus; }
    public void setBookingStatus(String bookingStatus) { this.bookingStatus = bookingStatus; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }

    public Integer getSelectedRoomCount() { return selectedRoomCount; }
    public void setSelectedRoomCount(Integer selectedRoomCount) { this.selectedRoomCount = selectedRoomCount; }

    public List<Long> getSelectedRoomIds() { return selectedRoomIds; }
    public void setSelectedRoomIds(List<Long> selectedRoomIds) { this.selectedRoomIds = selectedRoomIds; }

    public List<CheckoutRoomSummaryDto> getRoomSummaries() { return roomSummaries; }
    public void setRoomSummaries(List<CheckoutRoomSummaryDto> roomSummaries) { this.roomSummaries = roomSummaries; }

    public List<CheckoutInvoiceLineDto> getInvoiceLines() { return invoiceLines; }
    public void setInvoiceLines(List<CheckoutInvoiceLineDto> invoiceLines) { this.invoiceLines = invoiceLines; }

    public BigDecimal getTotalOriginalAmount() { return totalOriginalAmount; }
    public void setTotalOriginalAmount(BigDecimal totalOriginalAmount) { this.totalOriginalAmount = totalOriginalAmount; }

    public BigDecimal getTotalUsedRoomAmount() { return totalUsedRoomAmount; }
    public void setTotalUsedRoomAmount(BigDecimal totalUsedRoomAmount) { this.totalUsedRoomAmount = totalUsedRoomAmount; }

    public BigDecimal getTotalUnusedRoomAmount() { return totalUnusedRoomAmount; }
    public void setTotalUnusedRoomAmount(BigDecimal totalUnusedRoomAmount) { this.totalUnusedRoomAmount = totalUnusedRoomAmount; }

    public BigDecimal getTotalHotelKeepAmount() { return totalHotelKeepAmount; }
    public void setTotalHotelKeepAmount(BigDecimal totalHotelKeepAmount) { this.totalHotelKeepAmount = totalHotelKeepAmount; }

    public BigDecimal getTotalAllocatedPaidAmount() { return totalAllocatedPaidAmount; }
    public void setTotalAllocatedPaidAmount(BigDecimal totalAllocatedPaidAmount) { this.totalAllocatedPaidAmount = totalAllocatedPaidAmount; }

    public BigDecimal getTotalActualRevenue() { return totalActualRevenue; }
    public void setTotalActualRevenue(BigDecimal totalActualRevenue) { this.totalActualRevenue = totalActualRevenue; }

    public BigDecimal getTotalRefundToCustomer() { return totalRefundToCustomer; }
    public void setTotalRefundToCustomer(BigDecimal totalRefundToCustomer) { this.totalRefundToCustomer = totalRefundToCustomer; }

    public BigDecimal getTotalAdditionalCharge() { return totalAdditionalCharge; }
    public void setTotalAdditionalCharge(BigDecimal totalAdditionalCharge) { this.totalAdditionalCharge = totalAdditionalCharge; }

    public BigDecimal getRoomCharge() { return roomCharge; }
    public void setRoomCharge(BigDecimal roomCharge) { this.roomCharge = roomCharge; }

    public BigDecimal getServiceTotal() { return serviceTotal; }
    public void setServiceTotal(BigDecimal serviceTotal) { this.serviceTotal = serviceTotal; }

    public BigDecimal getBookingServiceTotal() { return bookingServiceTotal; }
    public void setBookingServiceTotal(BigDecimal bookingServiceTotal) { this.bookingServiceTotal = bookingServiceTotal; }

    public BigDecimal getDraftServiceLinesTotal() { return draftServiceLinesTotal; }
    public void setDraftServiceLinesTotal(BigDecimal draftServiceLinesTotal) { this.draftServiceLinesTotal = draftServiceLinesTotal; }

    public BigDecimal getRoomServiceFeeTotal() { return roomServiceFeeTotal; }
    public void setRoomServiceFeeTotal(BigDecimal roomServiceFeeTotal) { this.roomServiceFeeTotal = roomServiceFeeTotal; }

    public BigDecimal getManualServiceTotal() { return manualServiceTotal; }
    public void setManualServiceTotal(BigDecimal manualServiceTotal) { this.manualServiceTotal = manualServiceTotal; }

    public BigDecimal getDamageFeeTotal() { return damageFeeTotal; }
    public void setDamageFeeTotal(BigDecimal damageFeeTotal) { this.damageFeeTotal = damageFeeTotal; }

    public BigDecimal getManualSurchargeTotal() { return manualSurchargeTotal; }
    public void setManualSurchargeTotal(BigDecimal manualSurchargeTotal) { this.manualSurchargeTotal = manualSurchargeTotal; }

    public BigDecimal getLateCheckoutFeeTotal() { return lateCheckoutFeeTotal; }
    public void setLateCheckoutFeeTotal(BigDecimal lateCheckoutFeeTotal) { this.lateCheckoutFeeTotal = lateCheckoutFeeTotal; }

    public BigDecimal getEarlyCheckinFeeTotal() { return earlyCheckinFeeTotal; }
    public void setEarlyCheckinFeeTotal(BigDecimal earlyCheckinFeeTotal) { this.earlyCheckinFeeTotal = earlyCheckinFeeTotal; }

    public BigDecimal getEarlyCheckoutRefund() { return earlyCheckoutRefund; }
    public void setEarlyCheckoutRefund(BigDecimal earlyCheckoutRefund) { this.earlyCheckoutRefund = earlyCheckoutRefund; }

    public BigDecimal getActualRoomCharge() { return actualRoomCharge; }
    public void setActualRoomCharge(BigDecimal actualRoomCharge) { this.actualRoomCharge = actualRoomCharge; }

    public BigDecimal getGrandTotal() { return grandTotal; }
    public void setGrandTotal(BigDecimal grandTotal) { this.grandTotal = grandTotal; }

    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }

    public BigDecimal getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public BigDecimal getRefundSettlementAmount() { return refundSettlementAmount; }
    public void setRefundSettlementAmount(BigDecimal refundSettlementAmount) { this.refundSettlementAmount = refundSettlementAmount; }

    public boolean isPaymentRequired() { return paymentRequired; }
    public void setPaymentRequired(boolean paymentRequired) { this.paymentRequired = paymentRequired; }

    public boolean isRefundRequired() { return refundRequired; }
    public void setRefundRequired(boolean refundRequired) { this.refundRequired = refundRequired; }

    public String getCheckoutType() { return checkoutType; }
    public void setCheckoutType(String checkoutType) { this.checkoutType = checkoutType; }

    public Integer getUsedNights() { return usedNights; }
    public void setUsedNights(Integer usedNights) { this.usedNights = usedNights; }

    public Integer getUnusedNights() { return unusedNights; }
    public void setUnusedNights(Integer unusedNights) { this.unusedNights = unusedNights; }

    public BigDecimal getRefundRate() { return refundRate; }
    public void setRefundRate(BigDecimal refundRate) { this.refundRate = refundRate; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}