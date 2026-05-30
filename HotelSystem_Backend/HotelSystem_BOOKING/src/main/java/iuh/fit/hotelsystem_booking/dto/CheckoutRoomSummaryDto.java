package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CheckoutRoomSummaryDto {
    private Long bookingRoomId;
    private Long roomId;
    private String roomNumber;
    private String roomTypeName;
    private BigDecimal roomOriginalAmount;
    private BigDecimal roomCharge;
    private BigDecimal usedRoomAmount = BigDecimal.ZERO;
    private BigDecimal unusedRoomAmount = BigDecimal.ZERO;
    private BigDecimal hotelKeepAmount = BigDecimal.ZERO;
    private BigDecimal allocatedPaidAmount = BigDecimal.ZERO;
    private BigDecimal actualRoomRevenue = BigDecimal.ZERO;
    private BigDecimal serviceCharge;
    private BigDecimal damageFee;
    private BigDecimal manualSurcharge;
    private BigDecimal lateCheckoutFee;
    private BigDecimal totalAmount;
    private LocalDateTime actualCheckOutAt;

    private BigDecimal usedNightAmount = BigDecimal.ZERO;
    private BigDecimal unusedNightAmount = BigDecimal.ZERO;
    private BigDecimal hotelPenaltyAmount = BigDecimal.ZERO;
    private BigDecimal earlyCheckinFee = BigDecimal.ZERO;

    // ── Per-room settlement fields ────────────────────────────────────────────
    /** Tiền hoàn checkout sớm riêng của phòng này (80% × đêm chưa sử dụng × giá phòng) */
    private BigDecimal earlyCheckoutRefund = BigDecimal.ZERO;
    /** Số tiền hoàn cho khách sau khi trừ phí dịch vụ/phí phát sinh của phòng này */
    private BigDecimal refundToCustomer = BigDecimal.ZERO;
    /** Số tiền phải thu thêm nếu phòng này phát sinh vượt tiền đã phân bổ */
    private BigDecimal additionalCharge = BigDecimal.ZERO;
    /** Tổng phụ phí của phòng này (serviceCharge + damageFee + manualSurcharge + lateCheckoutFee) */
    private BigDecimal extraCharges = BigDecimal.ZERO;
    /** Tiền đã cọc/thanh toán được phân bổ tỷ lệ cho phòng này = totalPaid × roomOriginal / bookingOriginal */
    private BigDecimal paidAllocated = BigDecimal.ZERO;
    /** Số tiền thực hoàn khách cho phòng này (> 0 = hoàn; < 0 = thu thêm) */
    private BigDecimal netRefundForRoom = BigDecimal.ZERO;
    /** Số tiền phải thu thêm nếu netRefundForRoom < 0 */
    private BigDecimal additionalChargeForRoom = BigDecimal.ZERO;

    public Long getBookingRoomId() { return bookingRoomId; }
    public void setBookingRoomId(Long bookingRoomId) { this.bookingRoomId = bookingRoomId; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomTypeName() { return roomTypeName; }
    public void setRoomTypeName(String roomTypeName) { this.roomTypeName = roomTypeName; }

    public BigDecimal getRoomOriginalAmount() { return roomOriginalAmount; }
    public void setRoomOriginalAmount(BigDecimal roomOriginalAmount) { this.roomOriginalAmount = roomOriginalAmount; }

    public BigDecimal getRoomCharge() { return roomCharge; }
    public void setRoomCharge(BigDecimal roomCharge) { this.roomCharge = roomCharge; }

    public BigDecimal getUsedRoomAmount() { return usedRoomAmount; }
    public void setUsedRoomAmount(BigDecimal usedRoomAmount) { this.usedRoomAmount = usedRoomAmount; }

    public BigDecimal getUnusedRoomAmount() { return unusedRoomAmount; }
    public void setUnusedRoomAmount(BigDecimal unusedRoomAmount) { this.unusedRoomAmount = unusedRoomAmount; }

    public BigDecimal getHotelKeepAmount() { return hotelKeepAmount; }
    public void setHotelKeepAmount(BigDecimal hotelKeepAmount) { this.hotelKeepAmount = hotelKeepAmount; }

    public BigDecimal getAllocatedPaidAmount() { return allocatedPaidAmount; }
    public void setAllocatedPaidAmount(BigDecimal allocatedPaidAmount) { this.allocatedPaidAmount = allocatedPaidAmount; }

    public BigDecimal getActualRoomRevenue() { return actualRoomRevenue; }
    public void setActualRoomRevenue(BigDecimal actualRoomRevenue) { this.actualRoomRevenue = actualRoomRevenue; }

    public BigDecimal getServiceCharge() { return serviceCharge; }
    public void setServiceCharge(BigDecimal serviceCharge) { this.serviceCharge = serviceCharge; }

    public BigDecimal getDamageFee() { return damageFee; }
    public void setDamageFee(BigDecimal damageFee) { this.damageFee = damageFee; }

    public BigDecimal getManualSurcharge() { return manualSurcharge; }
    public void setManualSurcharge(BigDecimal manualSurcharge) { this.manualSurcharge = manualSurcharge; }

    public BigDecimal getLateCheckoutFee() { return lateCheckoutFee; }
    public void setLateCheckoutFee(BigDecimal lateCheckoutFee) { this.lateCheckoutFee = lateCheckoutFee; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public LocalDateTime getActualCheckOutAt() { return actualCheckOutAt; }
    public void setActualCheckOutAt(LocalDateTime actualCheckOutAt) { this.actualCheckOutAt = actualCheckOutAt; }

    public BigDecimal getEarlyCheckoutRefund() { return earlyCheckoutRefund; }
    public void setEarlyCheckoutRefund(BigDecimal earlyCheckoutRefund) { this.earlyCheckoutRefund = earlyCheckoutRefund; }

    public BigDecimal getRefundToCustomer() { return refundToCustomer; }
    public void setRefundToCustomer(BigDecimal refundToCustomer) { this.refundToCustomer = refundToCustomer; }

    public BigDecimal getAdditionalCharge() { return additionalCharge; }
    public void setAdditionalCharge(BigDecimal additionalCharge) { this.additionalCharge = additionalCharge; }

    public BigDecimal getExtraCharges() { return extraCharges; }
    public void setExtraCharges(BigDecimal extraCharges) { this.extraCharges = extraCharges; }

    public BigDecimal getPaidAllocated() { return paidAllocated; }
    public void setPaidAllocated(BigDecimal paidAllocated) { this.paidAllocated = paidAllocated; }

    public BigDecimal getNetRefundForRoom() { return netRefundForRoom; }
    public void setNetRefundForRoom(BigDecimal netRefundForRoom) { this.netRefundForRoom = netRefundForRoom; }

    public BigDecimal getAdditionalChargeForRoom() { return additionalChargeForRoom; }
    public void setAdditionalChargeForRoom(BigDecimal additionalChargeForRoom) { this.additionalChargeForRoom = additionalChargeForRoom; }

    public BigDecimal getUsedNightAmount() { return usedNightAmount; }
    public void setUsedNightAmount(BigDecimal usedNightAmount) { this.usedNightAmount = usedNightAmount; }

    public BigDecimal getUnusedNightAmount() { return unusedNightAmount; }
    public void setUnusedNightAmount(BigDecimal unusedNightAmount) { this.unusedNightAmount = unusedNightAmount; }

    public BigDecimal getHotelPenaltyAmount() { return hotelPenaltyAmount; }
    public void setHotelPenaltyAmount(BigDecimal hotelPenaltyAmount) { this.hotelPenaltyAmount = hotelPenaltyAmount; }

    public BigDecimal getEarlyCheckinFee() { return earlyCheckinFee; }
    public void setEarlyCheckinFee(BigDecimal earlyCheckinFee) { this.earlyCheckinFee = earlyCheckinFee; }
}