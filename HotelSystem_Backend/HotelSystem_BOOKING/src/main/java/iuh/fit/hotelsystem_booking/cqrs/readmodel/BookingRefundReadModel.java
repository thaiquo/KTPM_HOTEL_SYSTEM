package iuh.fit.hotelsystem_booking.cqrs.readmodel;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "booking_refund_read_model")
public class BookingRefundReadModel {
    @Id
    private Long refundId;
    private Long bookingId;
    private String bookingCode;
    private Long userId;
    private String customerName;
    private String paymentTransactionId;
    private Double paidAmount = 0.0;
    private Double cancellationFee = 0.0;
    private Double refundAmount = 0.0;
    private String refundMethod;
    private String status;
    private String publicStatus;
    private String reason;
    private Long assignedTo;
    private Long processedByStaffId;
    private LocalDateTime dueAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getRefundId() { return refundId; }
    public void setRefundId(Long refundId) { this.refundId = refundId; }
    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
    public String getBookingCode() { return bookingCode; }
    public void setBookingCode(String bookingCode) { this.bookingCode = bookingCode; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPaymentTransactionId() { return paymentTransactionId; }
    public void setPaymentTransactionId(String paymentTransactionId) { this.paymentTransactionId = paymentTransactionId; }
    public Double getPaidAmount() { return paidAmount; }
    public void setPaidAmount(Double paidAmount) { this.paidAmount = paidAmount; }
    public Double getCancellationFee() { return cancellationFee; }
    public void setCancellationFee(Double cancellationFee) { this.cancellationFee = cancellationFee; }
    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }
    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getPublicStatus() { return publicStatus; }
    public void setPublicStatus(String publicStatus) { this.publicStatus = publicStatus; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Long getAssignedTo() { return assignedTo; }
    public void setAssignedTo(Long assignedTo) { this.assignedTo = assignedTo; }
    public Long getProcessedByStaffId() { return processedByStaffId; }
    public void setProcessedByStaffId(Long processedByStaffId) { this.processedByStaffId = processedByStaffId; }
    public LocalDateTime getDueAt() { return dueAt; }
    public void setDueAt(LocalDateTime dueAt) { this.dueAt = dueAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
