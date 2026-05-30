ALTER TABLE booking_invoices
    ALTER COLUMN lines_json TYPE TEXT USING lines_json::TEXT;
