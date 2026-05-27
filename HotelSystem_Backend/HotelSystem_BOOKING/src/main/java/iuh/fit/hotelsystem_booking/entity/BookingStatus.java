package iuh.fit.hotelsystem_booking.entity;

public enum BookingStatus {
    CREATED,
    PENDING_PAYMENT,
    PENDING,
    DEPOSIT_PAID,
    CONFIRMED,
    BOOKED,
    PARTIALLY_CHECKED_IN,
    CHECKED_IN,
    PARTIALLY_CHECKED_OUT,
    CHECKOUT_PENDING_PAYMENT,
    CHECKED_OUT,
    CANCEL_REQUESTED,
    COMPLETED,
    CANCELLED,
    NO_SHOW
}
