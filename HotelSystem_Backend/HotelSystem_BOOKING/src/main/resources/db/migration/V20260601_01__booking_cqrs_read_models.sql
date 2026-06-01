CREATE TABLE IF NOT EXISTS booking_invoice_read_model (
    invoice_id BIGINT PRIMARY KEY,
    invoice_code VARCHAR(64),
    booking_id BIGINT NOT NULL,
    booking_code VARCHAR(64),
    customer_user_id BIGINT,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(64),
    room_numbers VARCHAR(512),
    invoice_status VARCHAR(64),
    booking_status VARCHAR(64),
    payment_status VARCHAR(64),
    refund_status VARCHAR(64),
    gross_invoice_amount NUMERIC(19, 2) DEFAULT 0,
    total_refund_amount NUMERIC(19, 2) DEFAULT 0,
    net_revenue NUMERIC(19, 2) DEFAULT 0,
    paid_amount NUMERIC(19, 2) DEFAULT 0,
    remaining_amount NUMERIC(19, 2) DEFAULT 0,
    checkout_staff_id BIGINT,
    checkin_staff_id BIGINT,
    checkout_time TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoice_read_booking_id ON booking_invoice_read_model(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoice_read_booking_code ON booking_invoice_read_model(booking_code);
CREATE INDEX IF NOT EXISTS idx_invoice_read_customer_name ON booking_invoice_read_model(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoice_read_created_at ON booking_invoice_read_model(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_read_status ON booking_invoice_read_model(invoice_status, payment_status);

CREATE TABLE IF NOT EXISTS booking_refund_read_model (
    refund_id BIGINT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    booking_code VARCHAR(64),
    user_id BIGINT,
    customer_name VARCHAR(255),
    payment_transaction_id VARCHAR(255),
    paid_amount DOUBLE PRECISION DEFAULT 0,
    cancellation_fee DOUBLE PRECISION DEFAULT 0,
    refund_amount DOUBLE PRECISION DEFAULT 0,
    refund_method VARCHAR(64),
    status VARCHAR(64),
    public_status VARCHAR(64),
    reason VARCHAR(255),
    assigned_to BIGINT,
    processed_by_staff_id BIGINT,
    due_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refund_read_user_id ON booking_refund_read_model(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_read_booking_id ON booking_refund_read_model(booking_id);
CREATE INDEX IF NOT EXISTS idx_refund_read_status ON booking_refund_read_model(status);
CREATE INDEX IF NOT EXISTS idx_refund_read_created_at ON booking_refund_read_model(created_at);
