-- ============================================================
-- AUTO SEED AUTH SERVICE
-- Chạy tự động sau khi Hibernate tạo schema
-- Mật khẩu mặc định là 123456 (đã được băm sẵn bằng BCrypt)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo Role nếu chưa có
INSERT INTO roles (name) VALUES ('ADMIN'), ('STAFF'), ('CUSTOMER') ON CONFLICT (name) DO NOTHING;

-- Xóa nếu đã tồn tại để tránh lỗi trùng lặp khi chạy lại
DELETE FROM users WHERE email IN ('tanthinh@gmail.com', 'quocthai@gmail.com', 'vansang@gmail.com');

-- Tạo tài khoản ADMIN
INSERT INTO users (email, password, name, phone_number, active, role_id)
VALUES (
    'tanthinh@gmail.com',
    crypt('123456', gen_salt('bf', 10)),
    'Tan Thinh',
    '0901234567',
    true,
    (SELECT id FROM roles WHERE name = 'ADMIN')
);

-- Tạo nhân viên 1
INSERT INTO users (email, password, name, phone_number, active, role_id)
VALUES (
    'quocthai@gmail.com',
    crypt('123456', gen_salt('bf', 10)),
    'Quoc Thai',
    '0902345678',
    true,
    (SELECT id FROM roles WHERE name = 'STAFF')
);

-- Tạo nhân viên 2
INSERT INTO users (email, password, name, phone_number, active, role_id)
VALUES (
    'vansang@gmail.com',
    crypt('123456', gen_salt('bf', 10)),
    'Van Sang',
    '0903456789',
    true,
    (SELECT id FROM roles WHERE name = 'STAFF')
);
