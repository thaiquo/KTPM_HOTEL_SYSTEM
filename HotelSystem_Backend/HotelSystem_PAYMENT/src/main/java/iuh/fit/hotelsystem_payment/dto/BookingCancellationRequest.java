package iuh.fit.hotelsystem_payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request for cancelling a booking with optional refund.
 * If refund is needed, a RefundTransaction will be created for staff approval.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingCancellationRequest {
    
    /** Booking ID to cancel */
    private Long bookingId;
    
    /** User/customer ID requesting cancellation */
        /** Room ID associated with this booking (needed to release room status) */
        private Long roomId;
    
        /** User/customer ID requesting cancellation */
    private Long userId;
    
    /** Whether the customer is eligible for refund per policy */
    private Boolean eligibleForRefund;
    
    /** Refund amount if applicable (null if no refund) */
    private Double refundAmount;
    
    /** Cancellation reason or note */
    private String cancellationReason;
    
    /** Payment transaction ID to link the refund source (for VNPAY tracking) */
    private String originalTransactionId;
}
