package iuh.fit.hotelsystem_booking.dto.invoice;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class InvoiceListDto {
    private Long id;
    private String invoiceCode;
    private Long bookingId;
    private String bookingCode;
    private String customerName;
    private String customerPhone;
    private String roomNumbers;
    private LocalDateTime createdAt;
    
    // Revenue calculations
    private BigDecimal grossInvoiceAmount;
    private BigDecimal totalRefundAmount;
    private BigDecimal netRevenue;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    
    private String invoiceStatus; // DRAFT, PARTIAL, COMPLETED, CANCELLED
    private String status;
    private String paymentStatus; // UNPAID, PARTIALLY_PAID, PAID, REFUNDED
}
