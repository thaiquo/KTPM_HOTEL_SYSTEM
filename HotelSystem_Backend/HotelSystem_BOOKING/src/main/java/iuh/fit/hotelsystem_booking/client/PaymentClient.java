package iuh.fit.hotelsystem_booking.client;

import iuh.fit.hotelsystem_booking.dto.RefundAllocationLineDto;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentClient {
    void requestLateCheckoutFeePayment(Long bookingId, Long userId, BigDecimal amount);

    /**
     * Payment Service allocates refund to original payers (REMAINING before DEPOSIT, etc.).
     */
    void requestEarlyCheckoutRefund(Long bookingId, BigDecimal refundAmount, String reason, Long processedByStaffId);

    /** Preview hoàn tiền theo giao dịch gốc (không ghi DB). */
    List<RefundAllocationLineDto> previewRefundAllocation(Long bookingId, BigDecimal refundAmount);

    boolean isLateCheckoutFeePaid(Long bookingId);
}
