package iuh.fit.hotelsystem_payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for booking cancellation request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingCancellationResponse {
    
    /** Booking ID */
    private Long bookingId;
    
    /** Cancellation status */
    private String status;
    
    /** Refund transaction ID if refund is created */
    private Long refundTransactionId;
    
    /** Refund amount if applicable */
    private Double refundAmount;
    
    /** Original payment ID that was cancelled */
    private Long originalPaymentId;
    
    /** Message describing the result */
    private String message;
}
