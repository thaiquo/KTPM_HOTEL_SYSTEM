-- ============================================================
-- HOTEL ROOM SYSTEM - FULL SEED DATA
-- 42 phòng | 5 loại | 8 tầng
-- Phòng chủ lực: DELUXE (chiếm ~40%)
-- ============================================================

TRUNCATE TABLE room_status_history, room_amenities, room_bed_override, amenities, room_type_bed_config, bed_types, room_type_images, rooms, room_types RESTART IDENTITY CASCADE;

-- ============================================================
-- 1. ROOM_TYPES
-- ============================================================

INSERT INTO room_types (id, type, base_price, max_capacity, default_capacity, description) VALUES
(1, 'STANDARD',   800000,  2, 2, 'Phòng tiêu chuẩn, tiện nghi cơ bản, phù hợp cho khách công tác hoặc ngắn ngày'),
(2, 'DELUXE',    1400000,  2, 2, 'Phòng cao cấp hơn Standard, view đẹp, nội thất hiện đại, là phòng chủ lực của khách sạn'),
(3, 'EXECUTIVE', 2000000,  2, 2, 'Phòng dành cho khách thương nhân, kèm khu vực làm việc riêng và quyền truy cập Executive Lounge'),
(4, 'FAMILY',    2400000,  4, 3, 'Phòng rộng rãi cho gia đình, có cấu hình giường linh hoạt, phù hợp 3-4 người'),
(5, 'SUITE',     4500000,  3, 2, 'Phòng hạng sang, có phòng khách riêng, nội thất cao cấp, view toàn cảnh');

-- ============================================================
-- 1.1 ROOM_TYPE_IMAGES
-- ============================================================
INSERT INTO room_type_images (room_type_id, image_url, is_thumbnail) VALUES
-- STANDARD
(1, 'https://images.unsplash.com/photo-1779869423159-0131de35997f?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', true),
(1, 'https://images.unsplash.com/photo-1779869423124-eba165749b92?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(1, 'https://images.unsplash.com/photo-1779869423166-5fc77045ea0f?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(1, 'https://images.unsplash.com/photo-1779869423162-518ae816de3c?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
-- DELUXE
(2, 'https://images.unsplash.com/photo-1779869807491-820ac8a46a9b?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', true),
(2, 'https://images.unsplash.com/photo-1779869807478-6a209da76890?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(2, 'https://images.unsplash.com/photo-1779869807503-5a009cfe6e3e?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(2, 'https://images.unsplash.com/photo-1779869807467-a4486680883d?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8Mnx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
-- EXECUTIVE
(3, 'https://images.unsplash.com/photo-1779870055520-cfefccf48362?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', true),
(3, 'https://images.unsplash.com/photo-1779870055648-e875fa4ae000?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8Mnx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(3, 'https://images.unsplash.com/photo-1779870335923-e23babfd6903?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(3, 'https://images.unsplash.com/photo-1779870336019-983fc176a602?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8Mnx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
-- FAMILY
(4, 'https://images.unsplash.com/photo-1779870458293-463632e8c90d?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', true),
(4, 'https://images.unsplash.com/photo-1779870458284-46ee193ceb23?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8Mnx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(4, 'https://images.unsplash.com/photo-1779870458288-95fd59cd2c5b?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8M3x8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(4, 'https://images.unsplash.com/photo-1779870458318-596057e61923?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8NHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80',    false),
-- SUITE
(5, 'https://images.unsplash.com/photo-1779870922521-5f351c33abaa?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8MXx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', true),
(5, 'https://images.unsplash.com/photo-1779870922579-2f061880fa14?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(5, 'https://images.unsplash.com/photo-1779870922525-3d68afea4233?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwcm9maWxlLXBhZ2V8M3x8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false),
(5, 'https://images.unsplash.com/photo-1779870922514-cee14d07d9f4?auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&w=800&q=80', false);

-- ============================================================
-- 2. BED_TYPES
-- ============================================================

INSERT INTO bed_types (id, code, name, max_occupants_per_bed) VALUES
(1, 'KING',        'King Bed',        2),
(2, 'QUEEN',       'Queen Bed',       2),
(3, 'TWIN',        'Twin Bed',        1),
(4, 'DOUBLE',      'Double Bed',      2),
(5, 'SOFA_BED',    'Sofa Bed',        1),
(6, 'BUNK',        'Bunk Bed',        2);

-- ============================================================
-- 3. ROOM_TYPE_BED_CONFIG
-- ============================================================

-- STANDARD: 1 Queen hoặc 2 Twin
INSERT INTO room_type_bed_config (room_type_id, bed_type_id, quantity, is_primary) VALUES
(1, 2, 1, TRUE),   -- Standard: 1 Queen (default)
(1, 3, 2, FALSE),  -- Standard: hoặc 2 Twin

-- DELUXE: 1 King (chủ lực) hoặc 2 Twin
(2, 1, 1, TRUE),   -- Deluxe: 1 King
(2, 3, 2, FALSE),  -- Deluxe: hoặc 2 Twin

-- EXECUTIVE: 1 King
(3, 1, 1, TRUE),   -- Executive: 1 King

-- FAMILY: 1 King + 2 Twin
(4, 1, 1, TRUE),   -- Family: 1 King (phòng ngủ chính)
(4, 3, 2, FALSE),  -- Family: + 2 Twin (phòng ngủ phụ)

-- SUITE: 1 King + 1 Sofa Bed
(5, 1, 1, TRUE),   -- Suite: 1 King
(5, 5, 1, FALSE);  -- Suite: 1 Sofa Bed (phòng khách)

-- ============================================================
-- 4. AMENITIES
-- ============================================================

INSERT INTO amenities (id, code, name, category, is_chargeable, icon) VALUES
-- BEDROOM
(1,  'SMART_TV',        'Smart TV 55"',           'BEDROOM',   FALSE, 'tv'),
(2,  'MINIBAR',         'Minibar',                'BEDROOM',   TRUE,  'wine-bottle'),
(3,  'SAFE',            'Két sắt điện tử',        'BEDROOM',   FALSE, 'lock'),
(4,  'BLACKOUT_CURTAIN','Rèm chống sáng',         'BEDROOM',   FALSE, 'blinds'),
(5,  'PREMIUM_BEDDING', 'Chăn gối cao cấp',       'BEDROOM',   FALSE, 'bed'),
(6,  'SOFA_SEATING',    'Khu vực sofa ngồi',      'BEDROOM',   FALSE, 'sofa'),
(7,  'WORK_DESK',       'Bàn làm việc',           'BEDROOM',   FALSE, 'desk'),

-- BATHROOM
(8,  'RAIN_SHOWER',     'Vòi sen rain shower',    'BATHROOM',  FALSE, 'shower'),
(9,  'BATHTUB',         'Bồn tắm',                'BATHROOM',  FALSE, 'bath'),
(10, 'DUAL_SINK',       'Bồn rửa đôi',            'BATHROOM',  FALSE, 'sink'),
(11, 'TOILETRIES',      'Bộ đồ vệ sinh cao cấp',  'BATHROOM',  FALSE, 'soap'),
(12, 'BIDET',           'Toilet thông minh',      'BATHROOM',  FALSE, 'toilet'),

-- TECHNOLOGY
(13, 'HIGH_SPEED_WIFI', 'WiFi tốc độ cao',        'TECHNOLOGY',FALSE, 'wifi'),
(14, 'BLUETOOTH_SPEAKER','Loa Bluetooth',          'TECHNOLOGY',FALSE, 'speaker'),
(15, 'USB_CHARGING',    'Cổng sạc USB đầu giường','TECHNOLOGY',FALSE, 'usb'),
(16, 'SMART_CONTROL',   'Điều khiển phòng thông minh','TECHNOLOGY',FALSE,'tablet'),

-- KITCHEN/PANTRY
(17, 'COFFEE_MACHINE',  'Máy pha cà phê Nespresso','KITCHEN',  FALSE, 'coffee'),
(18, 'KETTLE',          'Ấm đun nước',            'KITCHEN',   FALSE, 'kettle'),
(19, 'MICROWAVE',       'Lò vi sóng',             'KITCHEN',   FALSE, 'microwave'),
(20, 'KITCHENETTE',     'Bếp nhỏ',                'KITCHEN',   FALSE, 'kitchen'),

-- SPECIAL
(21, 'JACUZZI',         'Bồn Jacuzzi',            'SPECIAL',   FALSE, 'hot-tub'),
(22, 'PRIVATE_BALCONY', 'Ban công riêng',         'SPECIAL',   FALSE, 'balcony'),
(23, 'LOUNGE_ACCESS',   'Quyền vào Executive Lounge','SPECIAL',FALSE, 'lounge'),
(24, 'WELCOME_FRUIT',   'Hoa quả chào mừng',      'SPECIAL',   FALSE, 'apple'),
(25, 'TURNDOWN_SERVICE','Dịch vụ trải giường tối','SPECIAL',   FALSE, 'moon');

-- ============================================================
-- 5. ROOMS (42 phòng | tầng 2-9 | 5-6 phòng/tầng)
-- ============================================================

ALTER TABLE rooms ALTER COLUMN actual_capacity DROP NOT NULL;
ALTER TABLE rooms ALTER COLUMN floor DROP NOT NULL;
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE', 'BLOCKED'));

INSERT INTO rooms (
  id, room_number, room_type_id,
  status, area_m2, view_type,
  has_balcony, has_bathtub,
  smoking_policy, is_accessible, is_connecting, connected_room_id,
  floor_number, floor_level,
  last_cleaned_at, last_maintenance_at, maintenance_status
) VALUES

-- TẦNG 2 | STANDARD (4 phòng) | floor_level = LOW
(1,  '201', 1, 'AVAILABLE',    26, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  2,  2, 'LOW',  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '10 days', 'OK'),
(2,  '202', 1, 'OCCUPIED',     26, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  1,  2, 'LOW',  NOW() - INTERVAL '1 day',   NOW() - INTERVAL '15 days', 'OK'),
(3,  '203', 1, 'AVAILABLE',    26, 'Garden View', FALSE, FALSE, 'NON_SMOKING', TRUE,  FALSE, NULL, 2, 'LOW',  NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '7 days',  'OK'),
(4,  '204', 1, 'MAINTENANCE',  26, 'Garden View', FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 2, 'LOW',  NOW() - INTERVAL '2 days',   NOW() - INTERVAL '1 day',   'NEEDS_REPAIR'),

-- TẦNG 3 | STANDARD (4 phòng) + DELUXE bắt đầu (2 phòng)
(5,  '301', 1, 'OCCUPIED',     28, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '12 days', 'OK'),
(6,  '302', 1, 'AVAILABLE',    28, 'City View',   FALSE, FALSE, 'SMOKING',     FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '9 days',  'OK'),
(7,  '303', 1, 'CLEANING',     28, 'Garden View', FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '30 mins',  NOW() - INTERVAL '14 days', 'NEEDS_CLEANING'),
(8,  '304', 1, 'RESERVED',     28, 'Garden View', FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '11 days', 'OK'),
(9,  '305', 2, 'AVAILABLE',    32, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '8 days',  'OK'),
(10, '306', 2, 'OCCUPIED',     32, 'Pool View',   FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 3, 'LOW',  NOW() - INTERVAL '1 day',    NOW() - INTERVAL '20 days', 'OK'),

-- TẦNG 4 | DELUXE (3 phòng) + FAMILY (2 phòng) | floor_level = MID
(11, '401', 2, 'AVAILABLE',    34, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  12, 4, 'MID',  NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '5 days',  'OK'),
(12, '402', 2, 'AVAILABLE',    34, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  11, 4, 'MID',  NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '5 days',  'OK'),
(13, '403', 2, 'OCCUPIED',     34, 'Pool View',   TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 4, 'MID',  NOW() - INTERVAL '1 day',    NOW() - INTERVAL '18 days', 'OK'),
(14, '404', 4, 'AVAILABLE',    52, 'Garden View', FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 4, 'MID',  NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '6 days',  'OK'),
(15, '405', 4, 'RESERVED',     52, 'Pool View',   FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 4, 'MID',  NOW() - INTERVAL '8 hours',  NOW() - INTERVAL '13 days', 'OK'),
(40, '406', 2, 'OUT_OF_SERVICE', 34, 'No View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 4, 'MID',  NOW() - INTERVAL '5 days',   NOW() - INTERVAL '3 days',  'UNDER_MAINTENANCE'),

-- TẦNG 5 | DELUXE (3 phòng) + FAMILY (2 phòng) | floor_level = MID
(16, '501', 2, 'OCCUPIED',     34, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 5, 'MID',  NOW() - INTERVAL '2 days',   NOW() - INTERVAL '10 days', 'OK'),
(17, '502', 2, 'AVAILABLE',    34, 'City View',   FALSE, TRUE,  'NON_SMOKING', FALSE, TRUE,  18, 5, 'MID',  NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '7 days',  'OK'),
(18, '503', 2, 'AVAILABLE',    34, 'Pool View',   TRUE,  FALSE, 'NON_SMOKING', FALSE, TRUE,  17, 5, 'MID',  NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '7 days',  'OK'),
(19, '504', 4, 'OCCUPIED',     55, 'River View',  FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 5, 'MID',  NOW() - INTERVAL '1 day',    NOW() - INTERVAL '22 days', 'OK'),
(20, '505', 4, 'AVAILABLE',    55, 'City View',   FALSE, TRUE,  'NON_SMOKING', TRUE,  FALSE, NULL, 5, 'MID',  NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '4 days',  'OK'),
(41, '506', 2, 'AVAILABLE',    34, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 5, 'MID',  NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '8 days',  'OK'),
(42, '507', 2, 'OCCUPIED',     34, 'River View',  TRUE,  FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 5, 'MID',  NOW() - INTERVAL '1 day',    NOW() - INTERVAL '15 days', 'OK'),

-- TẦNG 6 | DELUXE (7 phòng) | floor_level = MID-HIGH
(21, '601', 2, 'AVAILABLE',    36, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 6, 'MID',  NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '9 days',  'OK'),
(22, '602', 2, 'OCCUPIED',     36, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 6, 'MID',  NOW() - INTERVAL '2 days',   NOW() - INTERVAL '25 days', 'OK'),
(23, '603', 2, 'RESERVED',     36, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 6, 'MID',  NOW() - INTERVAL '6 hours',  NOW() - INTERVAL '8 days',  'OK'),
(24, '604', 2, 'AVAILABLE',    36, 'Pool View',   TRUE,  FALSE, 'NON_SMOKING', FALSE, TRUE,  25, 6, 'MID',  NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '11 days', 'OK'),
(25, '605', 2, 'AVAILABLE',    36, 'Garden View', FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  24, 6, 'MID',  NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '11 days', 'OK'),
(26, '606', 2, 'CLEANING',     36, 'City View',   FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 6, 'MID',  NOW() - INTERVAL '1 hour',   NOW() - INTERVAL '6 days',  'NEEDS_CLEANING'),
(27, '607', 2, 'OCCUPIED',     36, 'City View',   FALSE, FALSE, 'SMOKING',     FALSE, FALSE, NULL, 6, 'MID',  NOW() - INTERVAL '1 day',    NOW() - INTERVAL '19 days', 'OK'),

-- TẦNG 7 | EXECUTIVE (7 phòng) | floor_level = HIGH
(28, '701', 3, 'AVAILABLE',    42, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, FALSE, NULL, 7, 'HIGH', NOW() - INTERVAL '2 hours',  NOW() - INTERVAL '5 days',  'OK'),
(29, '702', 3, 'OCCUPIED',     42, 'River View',  FALSE, TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 7, 'HIGH', NOW() - INTERVAL '2 days',   NOW() - INTERVAL '16 days', 'OK'),
(30, '703', 3, 'AVAILABLE',    42, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 7, 'HIGH', NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '8 days',  'OK'),
(31, '704', 3, 'RESERVED',     42, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  32, 7, 'HIGH', NOW() - INTERVAL '7 hours',  NOW() - INTERVAL '10 days', 'OK'),
(32, '705', 3, 'AVAILABLE',    42, 'City View',   FALSE, FALSE, 'NON_SMOKING', FALSE, TRUE,  31, 7, 'HIGH', NOW() - INTERVAL '3 hours',  NOW() - INTERVAL '10 days', 'OK'),
(33, '706', 3, 'OCCUPIED',     44, 'Pool View',   TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 7, 'HIGH', NOW() - INTERVAL '1 day',    NOW() - INTERVAL '14 days', 'OK'),
(34, '707', 3, 'BLOCKED',      44, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 7, 'HIGH', NOW() - INTERVAL '3 days',   NOW() - INTERVAL '2 days',  'OK'),

-- TẦNG 8 | SUITE (3 phòng) | floor_level = TOP
(35, '801', 5, 'AVAILABLE',    75, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 8, 'TOP',  NOW() - INTERVAL '4 hours',  NOW() - INTERVAL '3 days',  'OK'),
(36, '802', 5, 'OCCUPIED',     78, 'City View',   TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 8, 'TOP',  NOW() - INTERVAL '2 days',   NOW() - INTERVAL '7 days',  'OK'),
(37, '803', 5, 'RESERVED',     80, 'Pool View',   TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 8, 'TOP',  NOW() - INTERVAL '8 hours',  NOW() - INTERVAL '5 days',  'OK'),

-- TẦNG 9 | SUITE (2 phòng - Penthouse) | floor_level = TOP
(38, '901', 5, 'AVAILABLE',    95, 'River View',  TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 9, 'TOP',  NOW() - INTERVAL '5 hours',  NOW() - INTERVAL '4 days',  'OK'),
(39, '902', 5, 'OCCUPIED',    110, 'City View',   TRUE,  TRUE,  'NON_SMOKING', FALSE, FALSE, NULL, 9, 'TOP',  NOW() - INTERVAL '3 days',   NOW() - INTERVAL '6 days',  'OK');

UPDATE rooms r
SET actual_capacity = rt.max_capacity
FROM room_types rt
WHERE r.room_type_id = rt.id
  AND r.actual_capacity IS NULL;

UPDATE rooms
SET floor = floor_number
WHERE floor IS NULL;

ALTER TABLE rooms ALTER COLUMN actual_capacity SET NOT NULL;


-- ============================================================
-- 6. ROOM_BED_OVERRIDE (các phòng đặc biệt tùy chỉnh)
-- ============================================================

INSERT INTO room_bed_override (room_id, bed_type_id, quantity) VALUES
(3,  3, 2),  -- 2 Twin (dễ tiếp cận cho người khuyết tật)
(6,  3, 2),
(14, 1, 1),
(14, 3, 2),
(20, 2, 2),
(39, 1, 1),
(39, 5, 1);

-- ============================================================
-- 7. ROOM_AMENITIES
-- ============================================================

-- ---- STANDARD (8 phòng: id 1-8) ----
INSERT INTO room_amenities (room_id, amenity_id, is_active)
SELECT r.id, a.amenity_id, TRUE
FROM (VALUES (1),(2),(3),(4),(5),(6),(7),(8)) AS r(id)
CROSS JOIN (VALUES (1),(3),(4),(7),(8),(11),(13),(15),(17),(18)) AS a(amenity_id);

-- ---- DELUXE (17 phòng) ----
INSERT INTO room_amenities (room_id, amenity_id, is_active)
SELECT r.id, a.amenity_id, TRUE
FROM (VALUES (9),(10),(11),(12),(13),(16),(17),(18),(21),(22),(23),(24),(25),(26),(27),(40),(41),(42)) AS r(id)
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(11),(13),(14),(15),(17),(18),(24)) AS a(amenity_id);

-- Deluxe có bathtub (10, 13, 17, 22, 23, 26) thêm amenity bồn tắm
INSERT INTO room_amenities (room_id, amenity_id, is_active) VALUES
(10, 9, TRUE),(13, 9, TRUE),(17, 9, TRUE),
(22, 9, TRUE),(23, 9, TRUE),(26, 9, TRUE);

-- Deluxe có ban công thêm amenity 22
INSERT INTO room_amenities (room_id, amenity_id, is_active) VALUES
(13, 22, TRUE),(18, 22, TRUE),(22, 22, TRUE),
(23, 22, TRUE),(24, 22, TRUE),(42, 22, TRUE);

-- ---- EXECUTIVE (7 phòng: id 28-34) ----
INSERT INTO room_amenities (room_id, amenity_id, is_active)
SELECT r.id, a.amenity_id, TRUE
FROM (VALUES (28),(29),(30),(31),(32),(33),(34)) AS r(id)
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(11),(12),(13),(14),(15),(16),(17),(18),(23),(24),(25)) AS a(amenity_id);

-- Executive có bathtub: 29, 30, 33, 34
INSERT INTO room_amenities (room_id, amenity_id, is_active) VALUES
(29, 9, TRUE),(30, 9, TRUE),(33, 9, TRUE),(34, 9, TRUE);

-- Executive có ban công: 30, 33, 34
INSERT INTO room_amenities (room_id, amenity_id, is_active) VALUES
(30, 22, TRUE),(33, 22, TRUE),(34, 22, TRUE);

-- ---- FAMILY (5 phòng: id 14, 15, 19, 20) ----
INSERT INTO room_amenities (room_id, amenity_id, is_active)
SELECT r.id, a.amenity_id, TRUE
FROM (VALUES (14),(15),(19),(20)) AS r(id)
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(7),(8),(9),(11),(13),(15),(17),(18),(19),(24)) AS a(amenity_id);

-- ---- SUITE (5 phòng: id 35-39) ----
INSERT INTO room_amenities (room_id, amenity_id, is_active)
SELECT r.id, a.amenity_id, TRUE
FROM (VALUES (35),(36),(37),(38),(39)) AS r(id)
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13),(14),(15),(16),(17),(18),(19),(21),(22),(23),(24),(25)) AS a(amenity_id);

-- ============================================================
-- 8. ROOM STATUS HISTORY (sample - 15 bản ghi gần nhất)
-- ============================================================

INSERT INTO room_status_history (room_id, old_status, new_status, changed_at) VALUES
(1,  'CLEANING',   'AVAILABLE',     NOW() - INTERVAL '3 hours'),
(2,  'AVAILABLE',  'OCCUPIED',      NOW() - INTERVAL '6 hours'),
(4,  'AVAILABLE',  'MAINTENANCE',   NOW() - INTERVAL '1 day'),
(5,  'AVAILABLE',  'OCCUPIED',      NOW() - INTERVAL '2 days'),
(7,  'OCCUPIED',   'CLEANING',      NOW() - INTERVAL '30 mins'),
(8,  'AVAILABLE',  'RESERVED',      NOW() - INTERVAL '4 hours'),
(10, 'RESERVED',   'OCCUPIED',      NOW() - INTERVAL '1 day'),
(13, 'RESERVED',   'OCCUPIED',      NOW() - INTERVAL '12 hours'),
(16, 'AVAILABLE',  'OCCUPIED',      NOW() - INTERVAL '2 days'),
(19, 'AVAILABLE',  'OCCUPIED',      NOW() - INTERVAL '3 days'),
(22, 'RESERVED',   'OCCUPIED',      NOW() - INTERVAL '1 day'),
(26, 'OCCUPIED',   'CLEANING',      NOW() - INTERVAL '1 hour'),
(34, 'AVAILABLE',  'BLOCKED',       NOW() - INTERVAL '3 days'),
(36, 'RESERVED',   'OCCUPIED',      NOW() - INTERVAL '2 days'),
(40, 'AVAILABLE',  'OUT_OF_SERVICE',NOW() - INTERVAL '5 days');
