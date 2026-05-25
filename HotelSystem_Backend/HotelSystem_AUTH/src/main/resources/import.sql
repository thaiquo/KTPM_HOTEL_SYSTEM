-- ============================================================
-- AUTO SEED AUTH SERVICE
-- Chạy tự động sau khi Hibernate tạo schema
-- Mật khẩu mặc định là 123456 (đã được băm sẵn bằng BCrypt)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tạo Role nếu chưa có
INSERT INTO roles (name) VALUES ('ADMIN'), ('STAFF'), ('CUSTOMER') ON CONFLICT (name) DO NOTHING;

-- Xóa nếu đã tồn tại để tránh lỗi trùng lặp khi chạy lại
DELETE FROM users WHERE email IN (
    'tanthinh@gmail.com',
    'quocthai@gmail.com',
    'vansang@gmail.com',
    'nguyentanthinh@gmail.com',
    'minhchau@gmail.com',
    'quanghuy@gmail.com',
    'thuylinh@gmail.com',
    'anhkiet@gmail.com',
    'ngocanh@gmail.com',
    'duythanh@gmail.com',
    'maihoang@gmail.com',
    'baotran@gmail.com',
    'khoiminh@gmail.com'
);

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

-- Tạo khách hàng mẫu
INSERT INTO users (email, password, name, phone_number, active, role_id)
VALUES
('nguyentanthinh@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Nguyễn Tấn Thịnh', '0397994524', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('minhchau@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Trần Minh Châu', '0397994525', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('quanghuy@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Lê Quang Huy', '0397994526', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('thuylinh@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Phạm Thùy Linh', '0397994527', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('anhkiet@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Nguyễn Anh Kiệt', '0397994528', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('ngocanh@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Võ Ngọc Ánh', '0397994529', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('duythanh@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Bùi Duy Thành', '0397994530', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('maihoang@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Đặng Mai Hoàng', '0397994531', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('baotran@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Trịnh Bảo Trân', '0397994532', true, (SELECT id FROM roles WHERE name = 'CUSTOMER')),
('khoiminh@gmail.com', crypt('123456', gen_salt('bf', 10)), 'Phan Khôi Minh', '0397994533', true, (SELECT id FROM roles WHERE name = 'CUSTOMER'));
