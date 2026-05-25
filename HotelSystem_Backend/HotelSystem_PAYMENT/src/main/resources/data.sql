-- ============================================================
-- PAYMENT SERVICE - DEMO DATA MATCHING BOOKING SERVICE SEED
-- Booking seed uses RESTART IDENTITY, so DEMO-BKG-001..010 map to booking_id 1..10.
-- ============================================================
TRUNCATE TABLE payments RESTART IDENTITY CASCADE;

INSERT INTO payments (
    booking_id,
    user_id,
    payer_guest_id,
    payer_name,
    payer_phone,
    total_amount,
    paid_amount,
    amount,
    payment_type,
    invoice_category,
    method,
    status,
    transaction_id,
    payment_code,
    vnp_transaction_no,
    vnp_response_code,
    created_at,
    expired_at,
    paid_at,
    idempotency_key
) VALUES
-- DEMO-BKG-001: confirmed, deposit paid, remaining should be collected at check-in.
(1, 4, NULL, 'Nguyen Tan Thinh', '0397994524', 800000, 800000, 800000, 'DEPOSIT', 'CHECKIN', 'VNPAY', 'SUCCESS', 'TX-DEMO-001', 'PAY-DEMO-001', 'VNP-DEMO-001', '00', NOW() - INTERVAL '1 day', NULL, NOW() - INTERVAL '1 day', 'seed-payment-demo-001-deposit'),

-- DEMO-BKG-002: already checked in, fully paid.
(2, 5, NULL, 'Tran Minh Chau', '0397994525', 1600000, 1600000, 1600000, 'FULL', 'CHECKIN', 'CASH', 'SUCCESS', 'TX-DEMO-002', 'PAY-DEMO-002', NULL, NULL, NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days', 'seed-payment-demo-002-full'),

-- DEMO-BKG-003: room 305, deposit paid only. Test flow should collect 1,400,000 cash then check in.
(3, 6, NULL, 'Le Quang Huy', '0397994526', 1400000, 1400000, 1400000, 'DEPOSIT', 'CHECKIN', 'CASH', 'SUCCESS', 'TX-DEMO-003', 'PAY-DEMO-003', NULL, NULL, NOW() - INTERVAL '8 hours', NULL, NOW() - INTERVAL '8 hours', 'seed-payment-demo-003-deposit'),

-- DEMO-BKG-004: checked in with checkout pending payment; late checkout fee is still pending.
(4, 7, NULL, 'Pham Thuy Linh', '0397994527', 1400000, 1400000, 1400000, 'FULL', 'CHECKIN', 'CASH', 'SUCCESS', 'TX-DEMO-004', 'PAY-DEMO-004', NULL, NULL, NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days', 'seed-payment-demo-004-full'),
(4, 7, NULL, 'Pham Thuy Linh', '0397994527', 150000, 0, 150000, 'LATE_CHECKOUT_FEE', 'CHECKOUT', 'CASH', 'PENDING', 'LATE-DEMO-004', 'PAY-LATE-DEMO-004', NULL, NULL, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '2 hours', NULL, 'seed-payment-demo-004-late-fee'),

-- DEMO-BKG-005: payment hold exists but not paid.
(5, 8, NULL, 'Nguyen Anh Kiet', '0397994528', 2100000, 0, 2100000, 'DEPOSIT', 'CHECKIN', 'VNPAY', 'PENDING', 'TX-DEMO-005', 'PAY-DEMO-005', NULL, NULL, NOW() - INTERVAL '3 hours', NOW() + INTERVAL '4 hours', NULL, 'seed-payment-demo-005-pending-deposit'),

-- DEMO-BKG-006: completed, fully paid.
(6, 9, NULL, 'Vo Ngoc Anh', '0397994529', 2800000, 2800000, 2800000, 'FULL', 'CHECKIN', 'CASH', 'SUCCESS', 'TX-DEMO-006', 'PAY-DEMO-006', NULL, NULL, NOW() - INTERVAL '5 days', NULL, NOW() - INTERVAL '5 days', 'seed-payment-demo-006-full'),

-- DEMO-BKG-007: cancelled after deposit, refund already issued.
(7, 10, NULL, 'Bui Duy Thanh', '0397994530', 3600000, 3600000, 3600000, 'DEPOSIT', 'CHECKIN', 'VNPAY', 'SUCCESS', 'TX-DEMO-007', 'PAY-DEMO-007', 'VNP-DEMO-007', '00', NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '3 days', 'seed-payment-demo-007-deposit'),
(7, 10, NULL, 'Bui Duy Thanh', '0397994530', 3600000, 3600000, 3600000, 'REFUND', 'REFUND', 'BANK_TRANSFER', 'SUCCESS', 'RF-DEMO-007', 'PAY-REFUND-DEMO-007', NULL, NULL, NOW() - INTERVAL '2 days', NULL, NOW() - INTERVAL '2 days', 'seed-payment-demo-007-refund'),

-- DEMO-BKG-008: no-show after deposit.
(8, 11, NULL, 'Dang Mai Hoang', '0397994531', 1400000, 1400000, 1400000, 'DEPOSIT', 'CHECKIN', 'MOMO', 'SUCCESS', 'TX-DEMO-008', 'PAY-DEMO-008', NULL, NULL, NOW() - INTERVAL '4 days', NULL, NOW() - INTERVAL '4 days', 'seed-payment-demo-008-deposit'),

-- DEMO-BKG-009: premium room, deposit paid, useful for room-change tests.
(9, 12, NULL, 'Trinh Bao Tran', '0397994532', 6750000, 6750000, 6750000, 'DEPOSIT', 'CHECKIN', 'CASH', 'SUCCESS', 'TX-DEMO-009', 'PAY-DEMO-009', NULL, NULL, NOW() - INTERVAL '6 hours', NULL, NOW() - INTERVAL '6 hours', 'seed-payment-demo-009-deposit'),

-- DEMO-BKG-010: manual confirmation flow, unpaid pending deposit.
(10, 13, NULL, 'Phan Khoi Minh', '0397994533', 3000000, 0, 3000000, 'DEPOSIT', 'CHECKIN', 'VNPAY', 'PENDING', 'TX-DEMO-010', 'PAY-DEMO-010', NULL, NULL, NOW() - INTERVAL '2 hours', NOW() + INTERVAL '12 hours', NULL, 'seed-payment-demo-010-pending-deposit');
