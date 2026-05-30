ALTER TABLE booking_invoices
    ADD COLUMN IF NOT EXISTS invoice_code VARCHAR(64),
    ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32),
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS total_original_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS total_allocated_paid_amount NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS total_actual_revenue NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS total_early_checkout_refund NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS total_additional_charge NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS total_refund_to_customer NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(19, 2);

CREATE INDEX IF NOT EXISTS idx_booking_invoices_booking_id ON booking_invoices (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_created_at ON booking_invoices (created_at);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_invoice_code ON booking_invoices (invoice_code);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_invoice_status ON booking_invoices (invoice_status);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_payment_status ON booking_invoices (payment_status);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_customer_name ON booking_invoices (customer_name);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_customer_phone ON booking_invoices (customer_phone);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_total_actual_revenue ON booking_invoices (total_actual_revenue);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_total_allocated_paid_amount ON booking_invoices (total_allocated_paid_amount);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_remaining_balance ON booking_invoices (remaining_balance);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_total_refund_to_customer ON booking_invoices (total_refund_to_customer);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_total_additional_charge ON booking_invoices (total_additional_charge);
