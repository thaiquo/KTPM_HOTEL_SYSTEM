package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "booking_invoices",
        uniqueConstraints = @UniqueConstraint(name = "uk_booking_invoices_booking_id", columnNames = "booking_id")
)
public class BookingInvoice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    private BigDecimal amount;

    private String currency;

    @Column(name = "lines_json", columnDefinition = "TEXT")
    private String linesJson;

    private String invoiceCode;
    private String invoiceStatus;
    private String paymentStatus;
    private String customerName;
    private String customerPhone;

    // Denormalized aggregates for fast search/statistics (kept in sync when merging invoices)
    private BigDecimal totalOriginalAmount;
    private BigDecimal totalAllocatedPaidAmount;
    private BigDecimal totalActualRevenue;
    private BigDecimal totalEarlyCheckoutRefund;
    private BigDecimal totalAdditionalCharge;
    private BigDecimal totalRefundToCustomer;
    private BigDecimal remainingBalance;

    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getLinesJson() { return linesJson; }
    public void setLinesJson(String linesJson) { this.linesJson = linesJson; }

    public String getInvoiceCode() { return invoiceCode; }
    public void setInvoiceCode(String invoiceCode) { this.invoiceCode = invoiceCode; }

    public String getInvoiceStatus() { return invoiceStatus; }
    public void setInvoiceStatus(String invoiceStatus) { this.invoiceStatus = invoiceStatus; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerPhone() { return customerPhone; }
    public void setCustomerPhone(String customerPhone) { this.customerPhone = customerPhone; }

    public BigDecimal getTotalOriginalAmount() { return totalOriginalAmount; }
    public void setTotalOriginalAmount(BigDecimal totalOriginalAmount) { this.totalOriginalAmount = totalOriginalAmount; }

    public BigDecimal getTotalAllocatedPaidAmount() { return totalAllocatedPaidAmount; }
    public void setTotalAllocatedPaidAmount(BigDecimal totalAllocatedPaidAmount) { this.totalAllocatedPaidAmount = totalAllocatedPaidAmount; }

    public BigDecimal getTotalActualRevenue() { return totalActualRevenue; }
    public void setTotalActualRevenue(BigDecimal totalActualRevenue) { this.totalActualRevenue = totalActualRevenue; }

    public BigDecimal getTotalEarlyCheckoutRefund() { return totalEarlyCheckoutRefund; }
    public void setTotalEarlyCheckoutRefund(BigDecimal totalEarlyCheckoutRefund) { this.totalEarlyCheckoutRefund = totalEarlyCheckoutRefund; }

    public BigDecimal getTotalAdditionalCharge() { return totalAdditionalCharge; }
    public void setTotalAdditionalCharge(BigDecimal totalAdditionalCharge) { this.totalAdditionalCharge = totalAdditionalCharge; }

    public BigDecimal getTotalRefundToCustomer() { return totalRefundToCustomer; }
    public void setTotalRefundToCustomer(BigDecimal totalRefundToCustomer) { this.totalRefundToCustomer = totalRefundToCustomer; }

    public BigDecimal getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
