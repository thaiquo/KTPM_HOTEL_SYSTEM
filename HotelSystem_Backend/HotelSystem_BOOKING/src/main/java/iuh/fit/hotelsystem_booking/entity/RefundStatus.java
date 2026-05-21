package iuh.fit.hotelsystem_booking.entity;

public enum RefundStatus {
    PENDING,
    ASSIGNED,
    PROCESSING,
    APPROVED,
    REJECTED,
    COMPLETED,
    REFUNDED,
    SUCCESS,
    FAILED,
    OVERDUE;

    public PublicRefundStatus toPublic() {
        switch (this) {
            case PENDING:
                return PublicRefundStatus.PENDING;
            case ASSIGNED:
            case PROCESSING:
            case APPROVED:
                return PublicRefundStatus.IN_PROGRESS;
            case COMPLETED:
            case REFUNDED:
            case SUCCESS:
                return PublicRefundStatus.COMPLETED;
            case REJECTED:
            case FAILED:
                return PublicRefundStatus.FAILED;
            case OVERDUE:
                return PublicRefundStatus.OVERDUE;
            default:
                return PublicRefundStatus.PENDING;
        }
    }
}

/*
 * Utility mapping to a simplified PublicRefundStatus used for UI and invoice views.
 * This keeps the internal enum values unchanged (avoids DB migration) while
 * providing a stable reduced set for external consumers.
 */
