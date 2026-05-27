package iuh.fit.hotelsystem_booking.entity;

public enum BookingItemStatus {
    PENDING_PAYMENT,
    BOOKED,
    CHECKED_IN,
    CHECKED_OUT,
    NO_SHOW,
    /**
     * Legacy value kept so existing rows/tests still deserialize after the
     * room-level workflow is introduced. New paid rooms should use BOOKED.
     */
    ACTIVE,
    CANCELLED
}
