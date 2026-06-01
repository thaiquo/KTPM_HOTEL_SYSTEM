package iuh.fit.hotelsystem_booking.cqrs.event;

public final class CqrsProjectionEventType {
    public static final String BOOKING_CHANGED = "cqrs.booking.changed";
    public static final String INVOICE_CHANGED = "cqrs.invoice.changed";
    public static final String REFUND_CHANGED = "cqrs.refund.changed";

    private CqrsProjectionEventType() {
    }
}
