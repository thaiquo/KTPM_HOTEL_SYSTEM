package iuh.fit.hotelsystem_booking.dto.invoice;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class InvoiceSummaryDto {
    private long totalInvoices;
    private BigDecimal grossInvoiceAmount = BigDecimal.ZERO;
    private BigDecimal totalRefundAmount = BigDecimal.ZERO;
    private BigDecimal netRevenue = BigDecimal.ZERO;
    private BigDecimal totalPaidAmount = BigDecimal.ZERO;
    private BigDecimal totalRemainingAmount = BigDecimal.ZERO;
    private long refundedInvoiceCount;
    private long todayInvoiceCount;
    private BigDecimal totalActualRevenue = BigDecimal.ZERO;
    private BigDecimal totalEarlyCheckoutRefund = BigDecimal.ZERO;
    private BigDecimal totalRefundedAmount = BigDecimal.ZERO;
    private BigDecimal totalPendingRefundAmount = BigDecimal.ZERO;
    private BigDecimal totalAdditionalCharge = BigDecimal.ZERO;
    private BigDecimal totalRemainingToPay = BigDecimal.ZERO;
    private long paidInvoiceCount;
    private long unpaidInvoiceCount;
    private long partiallyPaidInvoiceCount;
}
