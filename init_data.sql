-- ============================================================
-- RESET DATA (PostgreSQL syntax)
-- ============================================================
TRUNCATE TABLE beds, room_type_images, rooms, room_types RESTART IDENTITY CASCADE;

-- ============================================================
-- 1. ROOM_TYPES
-- Columns: type, base_price, max_capacity, default_capacity, description
-- ============================================================
INSERT INTO room_types (type, base_price, max_capacity, default_capacity, description) VALUES
('STANDARD', 500000,  2, 2, 'Phòng tiêu chuẩn đầy đủ tiện nghi cơ bản, phù hợp cho 1-2 người lưu trú ngắn ngày.'),
('DELUXE',   900000,  3, 2, 'Phòng cao cấp không gian rộng rãi, nội thất hiện đại, view đẹp.'),
('SUPERIOR', 1200000, 3, 2, 'Phòng hạng sang thiết kế tinh tế, tầm nhìn thoáng, dịch vụ nâng cao.'),
('VIP',      2000000, 4, 2, 'Phòng VIP đẳng cấp, butler service 24/7, tiện nghi cao cấp toàn diện.'),
('FAMILY',   1600000, 6, 4, 'Phòng gia đình rộng lớn, nhiều phòng ngủ liên thông, bếp mini.'),
('SUITE',    3500000, 4, 2, 'Phòng Suite hạng sang nhất, phòng khách riêng, jacuzzi, butler cao cấp.');

-- ============================================================
-- 2. ROOM_TYPE_IMAGES (4 ảnh mỗi loại, 1 thumbnail)
-- ============================================================
INSERT INTO room_type_images (room_type_id, image_url, is_thumbnail) VALUES
-- STANDARD
(1, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80', true),
(1, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',    false),
(1, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',    false),
(1, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', false),
-- DELUXE
(2, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80', true),
(2, 'https://images.unsplash.com/photo-1582719478250-c89cae4df85b?w=800&q=80', false),
(2, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80', false),
(2, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80', false),
-- SUPERIOR
(3, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80', true),
(3, 'https://images.unsplash.com/photo-1551776235-dde6d4829808?w=800&q=80',    false),
(3, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80', false),
(3, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80', false),
-- VIP
(4, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', true),
(4, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80', false),
(4, 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80', false),
(4, 'https://images.unsplash.com/photo-1560448075-bb4caa6c9a4d?w=800&q=80',    false),
-- FAMILY
(5, 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&q=80', true),
(5, 'https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=800&q=80', false),
(5, 'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80',    false),
(5, 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80', false),
-- SUITE
(6, 'https://images.unsplash.com/photo-1560448075-bb4caa6c9a4d?w=800&q=80',    true),
(6, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80', false),
(6, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80', false),
(6, 'https://images.unsplash.com/photo-1582719478250-c89cae4df85b?w=800&q=80', false);

-- ============================================================
-- 3. ROOMS (Tất cả trạng thái đều là AVAILABLE)
-- ============================================================
-- STANDARD (101-105)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('101', 1, 'AVAILABLE', 1, 'View sân vườn, yên tĩnh.', 2),
('102', 1, 'AVAILABLE', 1, 'Gần thang máy.', 2),
('103', 1, 'AVAILABLE', 1, 'View hồ bơi.', 2),
('104', 1, 'AVAILABLE', 1, 'Gần khu vực sảnh.', 2),
('105', 1, 'AVAILABLE', 1, 'Cửa sổ lớn.', 2);

-- DELUXE (201-205)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('201', 2, 'AVAILABLE', 2, 'View thành phố.', 2),
('202', 2, 'AVAILABLE', 2, 'View hồ bơi, ban công riêng.', 2),
('203', 2, 'AVAILABLE', 2, 'Thêm sofa góc.', 3),
('204', 2, 'AVAILABLE', 2, 'Ban công nhìn ra vườn.', 2),
('205', 2, 'AVAILABLE', 2, 'Góc yên tĩnh.', 2);

-- SUPERIOR (301-305)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('301', 3, 'AVAILABLE', 3, 'View biển, bồn tắm đứng.', 2),
('302', 3, 'AVAILABLE', 3, 'View toàn thành phố.', 2),
('303', 3, 'AVAILABLE', 3, 'Có extra bed.', 3),
('304', 3, 'AVAILABLE', 3, 'View hồ bơi.', 2),
('305', 3, 'AVAILABLE', 3, 'Thiết kế Á Đông.', 2);

-- VIP (401-405)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('401', 4, 'AVAILABLE', 4, 'Butler 24/7, jacuzzi.', 2),
('402', 4, 'AVAILABLE', 4, 'View panorama.', 2),
('403', 4, 'AVAILABLE', 4, 'Diện tích mở rộng.', 4),
('404', 4, 'AVAILABLE', 4, 'Phong cách Á Đông.', 2),
('405', 4, 'AVAILABLE', 4, 'Quiet zone.', 3);

-- FAMILY (501-505)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('501', 5, 'AVAILABLE', 5, '2 phòng ngủ liên thông.', 4),
('502', 5, 'AVAILABLE', 5, 'Bếp mini + phòng khách.', 5),
('503', 5, 'AVAILABLE', 5, 'Khu vui chơi trẻ em.', 4),
('504', 5, 'AVAILABLE', 5, '3 phòng ngủ.', 6),
('505', 5, 'AVAILABLE', 5, '2 toilet riêng.', 5);

-- SUITE (601-605)
INSERT INTO rooms (room_number, room_type_id, status, floor, note, actual_capacity) VALUES
('601', 6, 'AVAILABLE', 6, 'Jacuzzi, butler 24/7.', 2),
('602', 6, 'AVAILABLE', 6, 'Honeymoon Suite.', 2),
('603', 6, 'AVAILABLE', 6, 'Presidential Suite.', 4),
('604', 6, 'AVAILABLE', 6, 'Penthouse tầng thượng.', 2),
('605', 6, 'AVAILABLE', 6, 'Thiết kế tối giản sang trọng.', 3);

-- ============================================================
-- 4. BEDS
-- ============================================================
INSERT INTO beds (type, quantity, room_id) VALUES 
('DOUBLE', 1, 1), ('SINGLE', 2, 2), ('DOUBLE', 1, 3), ('SINGLE', 1, 4), ('SINGLE', 2, 5),
('KING', 1, 6), ('KING', 1, 7), ('QUEEN', 1, 8), ('SOFA', 1, 8), ('KING', 1, 9), ('QUEEN', 1, 10),
('KING', 1, 11), ('KING', 1, 12), ('QUEEN', 1, 13), ('EXTRA', 1, 13), ('KING', 1, 14), ('SOFA', 1, 14), ('DOUBLE', 1, 15),
('KING', 1, 16), ('SOFA', 1, 16), ('KING', 1, 17), ('KING', 1, 18), ('DOUBLE', 1, 18), ('EXTRA', 1, 18), ('KING', 1, 19), ('KING', 1, 20), ('EXTRA', 1, 20),
('DOUBLE', 2, 21), ('QUEEN', 1, 22), ('DOUBLE', 1, 22), ('SOFA', 1, 22), ('DOUBLE', 2, 23), ('KING', 1, 24), ('DOUBLE', 2, 24), ('KING', 1, 25), ('DOUBLE', 1, 25), ('BUNK', 1, 25),
('KING', 1, 26), ('SOFA', 1, 26), ('KING', 1, 27), ('KING', 2, 28), ('KING', 1, 29), ('SOFA', 1, 29), ('KING', 1, 30), ('EXTRA', 1, 30);
