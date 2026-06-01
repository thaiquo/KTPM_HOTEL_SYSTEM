CREATE TABLE IF NOT EXISTS staff_booking_dashboard_read_model (
    booking_id BIGINT PRIMARY KEY,
    booking_code VARCHAR(64),
    user_id BIGINT,
    customer_name VARCHAR(255),
    representative_name VARCHAR(255),
    representative_phone VARCHAR(64),
    representative_cccd VARCHAR(64),
    room_ids VARCHAR(512),
    total_rooms INTEGER DEFAULT 0,
    total_guests INTEGER DEFAULT 0,
    check_in DATE,
    check_out DATE,
    status VARCHAR(64),
    payment_status VARCHAR(64),
    refund_status VARCHAR(64),
    rate_plan VARCHAR(64),
    source VARCHAR(64),
    total_price DOUBLE PRECISION DEFAULT 0,
    final_total DOUBLE PRECISION DEFAULT 0,
    paid_amount DOUBLE PRECISION DEFAULT 0,
    deposit_amount DOUBLE PRECISION DEFAULT 0,
    actual_check_in_at TIMESTAMP,
    actual_check_out_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_code ON staff_booking_dashboard_read_model(booking_code);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_user ON staff_booking_dashboard_read_model(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_status ON staff_booking_dashboard_read_model(status);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_payment ON staff_booking_dashboard_read_model(payment_status);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_checkin ON staff_booking_dashboard_read_model(check_in);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_checkout ON staff_booking_dashboard_read_model(check_out);
CREATE INDEX IF NOT EXISTS idx_staff_booking_dashboard_created ON staff_booking_dashboard_read_model(created_at);
