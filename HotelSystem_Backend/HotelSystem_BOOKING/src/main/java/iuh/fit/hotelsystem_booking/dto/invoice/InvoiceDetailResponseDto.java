package iuh.fit.hotelsystem_booking.dto.invoice;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class InvoiceDetailResponseDto {
    private Long id;
    private String invoiceCode;
    private Long bookingId;
    private String bookingCode;
    private LocalDateTime createdAt;
    private String invoiceStatus;
    private String bookingStatus;
    private String checkinStaffId;
    private String checkinStaff;
    private String checkinStaffName;
    private String checkoutStaffId;
    private String checkoutStaff;
    private String checkoutStaffName;
    private String processedByStaffId;
    private String processedBy;
    private String processedByName;
    private LocalDateTime checkoutTime;
    private String refundStatus;
    private String status;
    private String paymentStatus;

    private CustomerInfo customer;
    private List<RoomBreakdownDto> rooms;
    private List<ServiceChargeDto> serviceCharges;
    private List<DamageChargeDto> damageCharges;
    private List<java.util.Map<String, Object>> invoiceLines;
    private List<PaymentRecord> paymentTransactions;
    
    private PaymentHistorySection paymentHistory;
    private RefundHistorySection refundHistory;
    private RevenueSummarySection revenueSummary;

    @Data
    public static class CustomerInfo {
        private String fullName;
        private String phone;
        private String cccd;
    }

    @Data
    public static class RoomBreakdownDto {
        private Long bookingRoomId;
        private String roomName;
        private String roomCode;
        private String roomType;
        private LocalDateTime checkInDate;
        private LocalDateTime plannedCheckoutDate;
        private LocalDateTime actualCheckoutDate;
        private BigDecimal originalAmount;
        private BigDecimal usedAmount;
        private BigDecimal unusedAmount;
        private BigDecimal earlyCheckoutRefund;
        private BigDecimal hotelKeepAmount;
        private BigDecimal netRevenue;
        private BigDecimal allocatedPaidAmount;
        private String roomStatus;
    }

    @Data
    public static class ServiceChargeDto {
        private String category; // MINIBAR, LAUNDRY, RESTAURANT, OTHER
        private String itemName;
        private BigDecimal amount;
        private Integer quantity;
    }

    @Data
    public static class DamageChargeDto {
        private String itemName;
        private BigDecimal amount;
        private String note;
    }

    @Data
    public static class PaymentHistorySection {
        private List<PaymentRecord> records;
    }

    @Data
    public static class PaymentRecord {
        private Long id;
        private LocalDateTime time;
        private LocalDateTime paidAt;
        private BigDecimal amount;
        private String method; // VNPAY, CASH, TRANSFER
        private String status;
        private String paymentType;
        private String invoiceCategory;
        private String transactionId;
        private String paymentCode;
        private String vnpTransactionNo;
        private String payerName;
        private String payerPhone;
    }

    @Data
    public static class RefundHistorySection {
        private List<RefundRecord> records;
    }

    @Data
    public static class RefundRecord {
        private LocalDateTime time;
        private BigDecimal amount;
        private String reason;
        private String staff;
    }

    @Data
    public static class RevenueSummarySection {
        private BigDecimal totalRoomAmount = BigDecimal.ZERO;
        private BigDecimal totalServiceAmount = BigDecimal.ZERO;
        private BigDecimal totalDamageAmount = BigDecimal.ZERO;
        private BigDecimal grossInvoiceAmount = BigDecimal.ZERO;
        private BigDecimal totalEarlyCheckoutRefundAmount = BigDecimal.ZERO;
        private BigDecimal netRevenue = BigDecimal.ZERO;
        private BigDecimal totalPaidAmount = BigDecimal.ZERO;
        private BigDecimal totalAllocatedPaidAmount = BigDecimal.ZERO;
        private BigDecimal totalActualRevenue = BigDecimal.ZERO;
        private BigDecimal remainingAmount = BigDecimal.ZERO;
        private BigDecimal refundToCustomer = BigDecimal.ZERO;
        private BigDecimal alreadyRefundedAmount = BigDecimal.ZERO;
        private BigDecimal pendingRefundAmount = BigDecimal.ZERO;
        private BigDecimal additionalRefundAmount = BigDecimal.ZERO;
        private BigDecimal additionalChargeAmount = BigDecimal.ZERO;
        private BigDecimal remainingToPay = BigDecimal.ZERO;
    }
}
