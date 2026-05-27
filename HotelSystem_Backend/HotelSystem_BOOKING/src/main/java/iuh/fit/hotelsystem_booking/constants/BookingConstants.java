package iuh.fit.hotelsystem_booking.constants;

/**
 * Tập trung toàn bộ business rule đặt phòng khách sạn.
 * Thay đổi rule → chỉ cần sửa ở đây.
 */
public final class BookingConstants {

    private BookingConstants() {}

    // ============================================================
    // THỜI GIAN CHECK-IN / CHECK-OUT
    // ============================================================
    /** Giờ check-in tiêu chuẩn (14:00) */
    public static final int CHECK_IN_HOUR = 14;

    /** Giờ check-out tiêu chuẩn (12:00) */
    public static final int CHECK_OUT_HOUR = 12;

    // ============================================================
    // HOLD PHÒNG
    // ============================================================
    /**
     * Thời gian giữ phòng (phút) sau khi tạo booking.
     * = VNPAY expire (10 phút) + 1 phút buffer để callback kịp xử lý.
     * Giữ đồng bộ với vnpay.expireMinutes trong PAYMENT service.
     */
    public static final int HOLD_MINUTES = 11;

    /** VNPAY expire tham chiếu (phút) — chỉ để document, không dùng trực tiếp */
    public static final int VNPAY_EXPIRE_MINUTES = 10;

    // ============================================================
    // QUY ĐỊNH ĐẶT PHÒNG
    // ============================================================
    /** Phải đặt trước ít nhất bao nhiêu giờ */

    /** Không được đặt quá bao nhiêu ngày trong tương lai */
    public static final int MAX_ADVANCE_BOOKING_DAYS = 90;

    /** Số đêm tối thiểu (ngày thường) */
    public static final int MIN_STAY_NIGHTS = 1;

    /** Số đêm tối đa */
    public static final int MAX_STAY_NIGHTS = 14;

    // ============================================================
    // RULE NGÀY THƯỜNG
    // ============================================================
    public static final int    NORMAL_MIN_STAY_NIGHTS       = 1;
    public static final int    NORMAL_DEPOSIT_PERCENT       = 30;
    public static final double NORMAL_PRICE_MULTIPLIER      = 1.0;
    public static final int    NORMAL_FREE_CANCEL_HOURS     = 24;

    // ============================================================
    // RULE NGÀY LỄ
    // ============================================================
    public static final int    HOLIDAY_MIN_STAY_NIGHTS      = 2;
    public static final int    HOLIDAY_DEPOSIT_PERCENT      = 50;
    public static final double HOLIDAY_PRICE_MULTIPLIER     = 1.3;
    public static final int    HOLIDAY_FREE_CANCEL_HOURS    = 72;

    // ============================================================
    // RULE CUỐI TUẦN
    // ============================================================
    public static final double WEEKEND_PRICE_MULTIPLIER     = 1.2;

    // ============================================================
    // PAYMENT / REFUND
    // ============================================================
    public static final String PAYMENT_TYPE_FULL = "FULL";
    public static final String PAYMENT_TYPE_DEPOSIT = "DEPOSIT";
    public static final String PAYMENT_TYPE_HOTEL = "HOTEL";

    public static final String PAYMENT_STATUS_UNPAID = "UNPAID";
    public static final String PAYMENT_STATUS_REFUND_PENDING = "REFUND_PENDING";
    public static final String PAYMENT_STATUS_REFUNDED = "REFUNDED";
    public static final String PAYMENT_STATUS_PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED";
    public static final String PAYMENT_STATUS_NO_REFUND = "NO_REFUND";

    public static final String REFUND_METHOD_VNPAY = "VNPAY";
    public static final String REFUND_IDEMPOTENCY_PREFIX = "refund_";
    public static final String ROOM_CHANGE_REFUND_IDEMPOTENCY_PREFIX = "refund_room_change_";
    public static final int MAX_ACTIVE_REFUND_TASKS_PER_STAFF = 5;
    public static final int REFUND_SLA_HOURS = 48;
    public static final int REFUND_RETRY_DELAY_MINUTES = 5;
    public static final int REFUND_OVERDUE_CHECK_INTERVAL_MINUTES = 15;
    public static final String REFUND_STAFF_ROLE = "REFUND_STAFF";
    public static final String REFUND_PRIORITY_NORMAL = "NORMAL";
    public static final String REFUND_PRIORITY_HIGH = "HIGH";

    // ============================================================
    // RATE PLAN
    // ============================================================
    public static final int FLEXIBLE_DEPOSIT_PERCENT = 50;
    public static final int FLEXIBLE_DISCOUNT_PERCENT = 0;
    public static final boolean FLEXIBLE_REFUNDABLE = true;
    public static final int FLEXIBLE_FREE_CANCEL_HOURS = 24;
    public static final boolean FLEXIBLE_ALLOW_MODIFICATION = true;

    public static final int NON_REFUNDABLE_DEPOSIT_PERCENT = 100;
    public static final int NON_REFUNDABLE_DISCOUNT_PERCENT = 10;
    public static final boolean NON_REFUNDABLE_REFUNDABLE = false;
    public static final int NON_REFUNDABLE_FREE_CANCEL_HOURS = 0;
    public static final boolean NON_REFUNDABLE_ALLOW_MODIFICATION = false;

    // ============================================================
    // EARLY CHECK-IN FEE (% giá 1 đêm)
    // ============================================================
    /** Trước 06:00 → tính 1 đêm (100%) */
    public static final double EARLY_BEFORE_7_FEE_PERCENT   = 100.0;
    /** 06:00 – 10:00 → 50% */
    public static final double EARLY_7_TO_12_FEE_PERCENT    = 50.0;
    /** 10:00 – 14:00 → 20% */
    public static final double EARLY_12_TO_14_FEE_PERCENT   = 0.0;

    // ============================================================
    // LATE CHECK-OUT FEE (% giá 1 đêm)
    // ============================================================
    /** 12:00 – 14:00 → 20% */
    public static final double LATE_12_TO_14_FEE_PERCENT    = 20.0;
    /** 14:00 – 18:00 → 50% */
    public static final double LATE_14_TO_18_FEE_PERCENT    = 50.0;
    /** Sau 18:00 → 1 đêm (100%) */
    public static final double LATE_AFTER_18_FEE_PERCENT    = 100.0;

    // ============================================================
    // EARLY CHECK-OUT POLICY
    // ============================================================
    /** Flexible early checkout: tối thiểu tính bao nhiêu đêm */
    public static final int EARLY_CHECKOUT_MIN_CHARGE_NIGHTS = 1;

    /** Flexible early checkout: refund rate trên số đêm unused */
    public static final double EARLY_CHECKOUT_REFUND_RATE = 0.8;

    /** Prefix riêng cho refund do early checkout để không đụng cancellation refund */
    public static final String EARLY_CHECKOUT_REFUND_IDEMPOTENCY_PREFIX = "refund_early_checkout_";
}
