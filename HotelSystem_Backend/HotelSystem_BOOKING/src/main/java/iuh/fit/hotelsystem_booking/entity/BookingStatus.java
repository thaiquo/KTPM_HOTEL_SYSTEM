package iuh.fit.hotelsystem_booking.entity;

public enum BookingStatus {
    /** Alias rất cũ — giữ backward compat với data/queue */
    CREATED,
    /** Vừa tạo, chờ thanh toán (hold phòng 11 phút) */
    PENDING_PAYMENT,
    /** Alias cũ — giữ backward compat */
    PENDING,
    /** Đã cọc 30–50%, phòng xác nhận */
    DEPOSIT_PAID,
    /** Đã thanh toán đủ, phòng xác nhận */
    CONFIRMED,
    /** Khách đã check-in */
    CHECKED_IN,
    /** Đã trả phòng */
    COMPLETED,
    /** Đã hủy */
    CANCELLED,
    /** Khách không đến */
    NO_SHOW
}
