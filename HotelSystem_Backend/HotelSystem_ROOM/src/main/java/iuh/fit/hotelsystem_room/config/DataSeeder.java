package iuh.fit.hotelsystem_room.config;

import iuh.fit.hotelsystem_room.entity.Bed;
import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.RoomType;
import iuh.fit.hotelsystem_room.entity.RoomTypeImage;
import iuh.fit.hotelsystem_room.entity.enums.BedType;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import iuh.fit.hotelsystem_room.repository.RoomTypeRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
public class DataSeeder {

        private Room createRoom(String roomNumber, RoomType type, int floor, String note, int capacity) {
                return Room.builder()
                                .roomNumber(roomNumber)
                                .roomType(type)
                                .status(RoomStatus.AVAILABLE)
                                .floor(floor)
                                .actualCapacity(capacity)
                                .note(note)
                                .build();
        }

        @Bean
        @ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
        CommandLineRunner initRoom(RoomTypeRepository typeRepo, RoomRepository roomRepo) {
                return args -> {
                        if (typeRepo.count() == 0) {
                                RoomType t1 = RoomType.builder().type("STANDARD").basePrice(500000.0).maxCapacity(2)
                                                .defaultCapacity(1)
                                                .description("Phòng tiêu chuẩn đầy đủ tiện nghi cơ bản, phù hợp cho 1-2 người lưu trú ngắn ngày.")
                                                .build();
                                RoomType t2 = RoomType.builder().type("DELUXE").basePrice(900000.0).maxCapacity(3)
                                                .defaultCapacity(2)
                                                .description("Phòng cao cấp không gian rộng rãi, nội thất hiện đại, view đẹp.")
                                                .build();
                                RoomType t3 = RoomType.builder().type("SUPERIOR").basePrice(1200000.0).maxCapacity(3)
                                                .defaultCapacity(2)
                                                .description("Phòng hạng sang thiết kế tinh tế, tầm nhìn thoáng, dịch vụ nâng cao.")
                                                .build();
                                RoomType t4 = RoomType.builder().type("VIP").basePrice(2000000.0).maxCapacity(4)
                                                .defaultCapacity(2)
                                                .description("Phòng VIP đẳng cấp, butler service 24/7, tiện nghi cao cấp toàn diện.")
                                                .build();
                                RoomType t5 = RoomType.builder().type("FAMILY").basePrice(1600000.0).maxCapacity(6)
                                                .defaultCapacity(4)
                                                .description("Phòng gia đình rộng lớn, nhiều phòng ngủ liên thông, bếp mini.")
                                                .build();
                                RoomType t6 = RoomType.builder().type("SUITE").basePrice(3500000.0).maxCapacity(4)
                                                .defaultCapacity(2)
                                                .description("Phòng Suite hạng sang nhất, phòng khách riêng, jacuzzi, butler cao cấp.")
                                                .build();

                                t1.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t1).imageUrl(
                                                                "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t1).imageUrl(
                                                                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t1).imageUrl(
                                                                "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t1).imageUrl(
                                                                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80")
                                                                .isThumbnail(false).build()));
                                t2.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t2).imageUrl(
                                                                "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t2).imageUrl(
                                                                "https://images.unsplash.com/photo-1582719478250-c89cae4df85b?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t2).imageUrl(
                                                                "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t2).imageUrl(
                                                                "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80")
                                                                .isThumbnail(false).build()));
                                t3.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t3).imageUrl(
                                                                "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t3).imageUrl(
                                                                "https://images.unsplash.com/photo-1551776235-dde6d4829808?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t3).imageUrl(
                                                                "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t3).imageUrl(
                                                                "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80")
                                                                .isThumbnail(false).build()));
                                t4.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t4).imageUrl(
                                                                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t4).imageUrl(
                                                                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t4).imageUrl(
                                                                "https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t4).imageUrl(
                                                                "https://images.unsplash.com/photo-1560448075-bb4caa6c9a4d?w=800&q=80")
                                                                .isThumbnail(false).build()));
                                t5.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t5).imageUrl(
                                                                "https://images.unsplash.com/photo-1590490359683-658d3d23f972?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t5).imageUrl(
                                                                "https://images.unsplash.com/photo-1571508601891-ca5e7a713859?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t5).imageUrl(
                                                                "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t5).imageUrl(
                                                                "https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80")
                                                                .isThumbnail(false).build()));
                                t6.setImages(Arrays.asList(
                                                RoomTypeImage.builder().roomType(t6).imageUrl(
                                                                "https://images.unsplash.com/photo-1560448075-bb4caa6c9a4d?w=800&q=80")
                                                                .isThumbnail(true).build(),
                                                RoomTypeImage.builder().roomType(t6).imageUrl(
                                                                "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t6).imageUrl(
                                                                "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80")
                                                                .isThumbnail(false).build(),
                                                RoomTypeImage.builder().roomType(t6).imageUrl(
                                                                "https://images.unsplash.com/photo-1582719478250-c89cae4df85b?w=800&q=80")
                                                                .isThumbnail(false).build()));

                                List<RoomType> savedTypes = typeRepo.saveAll(Arrays.asList(t1, t2, t3, t4, t5, t6));

                                if (roomRepo.count() == 0) {
                                        List<Room> roomsToSave = new ArrayList<>();

                                        // Room 1-5: STANDARD
                                        Room r1 = createRoom("101", savedTypes.get(0), 1, "View sân vườn, yên tĩnh.",
                                                        2);
                                        r1.setBeds(Arrays.asList(Bed.builder().type(BedType.DOUBLE).quantity(1).room(r1)
                                                        .build()));

                                        Room r2 = createRoom("102", savedTypes.get(0), 1, "Gần thang máy.", 2);
                                        r2.setBeds(Arrays.asList(Bed.builder().type(BedType.SINGLE).quantity(2).room(r2)
                                                        .build()));

                                        Room r3 = createRoom("103", savedTypes.get(0), 1, "View hồ bơi.", 2);
                                        r3.setBeds(Arrays.asList(Bed.builder().type(BedType.DOUBLE).quantity(1).room(r3)
                                                        .build()));

                                        Room r4 = createRoom("104", savedTypes.get(0), 1, "Gần khu vực sảnh.", 2);
                                        r4.setBeds(Arrays.asList(Bed.builder().type(BedType.SINGLE).quantity(1).room(r4)
                                                        .build()));

                                        Room r5 = createRoom("105", savedTypes.get(0), 1, "Cửa sổ lớn.", 2);
                                        r5.setBeds(Arrays.asList(Bed.builder().type(BedType.SINGLE).quantity(2).room(r5)
                                                        .build()));

                                        // Room 6-10: DELUXE
                                        Room r6 = createRoom("201", savedTypes.get(1), 2, "View thành phố.", 2);
                                        r6.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r6).build()));

                                        Room r7 = createRoom("202", savedTypes.get(1), 2,
                                                        "View hồ bơi, ban công riêng.", 2);
                                        r7.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r7).build()));

                                        Room r8 = createRoom("203", savedTypes.get(1), 2, "Thêm sofa góc.", 3);
                                        r8.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.QUEEN).quantity(1).room(r8).build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r8).build()));

                                        Room r9 = createRoom("204", savedTypes.get(1), 2, "Ban công nhìn ra vườn.", 2);
                                        r9.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r9).build()));

                                        Room r10 = createRoom("205", savedTypes.get(1), 2, "Góc yên tĩnh.", 2);
                                        r10.setBeds(Arrays.asList(Bed.builder().type(BedType.QUEEN).quantity(1)
                                                        .room(r10).build()));

                                        // Room 11-15: SUPERIOR
                                        Room r11 = createRoom("301", savedTypes.get(2), 3, "View biển, bồn tắm đứng.",
                                                        2);
                                        r11.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(1).room(r11)
                                                        .build()));

                                        Room r12 = createRoom("302", savedTypes.get(2), 3, "View toàn thành phố.", 2);
                                        r12.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(1).room(r12)
                                                        .build()));

                                        Room r13 = createRoom("303", savedTypes.get(2), 3, "Có extra bed.", 3);
                                        r13.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.QUEEN).quantity(1).room(r13).build(),
                                                        Bed.builder().type(BedType.EXTRA).quantity(1).room(r13)
                                                                        .build()));

                                        Room r14 = createRoom("304", savedTypes.get(2), 3, "View hồ bơi.", 2);
                                        r14.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r14).build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r14)
                                                                        .build()));

                                        Room r15 = createRoom("305", savedTypes.get(2), 3, "Thiết kế Á Đông.", 2);
                                        r15.setBeds(Arrays.asList(Bed.builder().type(BedType.DOUBLE).quantity(1)
                                                        .room(r15).build()));

                                        // Room 16-20: VIP
                                        Room r16 = createRoom("401", savedTypes.get(3), 4, "Butler 24/7, jacuzzi.", 2);
                                        r16.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r16).build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r16)
                                                                        .build()));

                                        Room r17 = createRoom("402", savedTypes.get(3), 4, "View panorama.", 2);
                                        r17.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(1).room(r17)
                                                        .build()));

                                        Room r18 = createRoom("403", savedTypes.get(3), 4, "Diện tích mở rộng.", 4);
                                        r18.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r18).build(),
                                                        Bed.builder().type(BedType.DOUBLE).quantity(1).room(r18)
                                                                        .build(),
                                                        Bed.builder().type(BedType.EXTRA).quantity(1).room(r18)
                                                                        .build()));

                                        Room r19 = createRoom("404", savedTypes.get(3), 4, "Phong cách Á Đông.", 2);
                                        r19.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(1).room(r19)
                                                        .build()));

                                        Room r20 = createRoom("405", savedTypes.get(3), 4, "Quiet zone.", 3);
                                        r20.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r20).build(),
                                                        Bed.builder().type(BedType.EXTRA).quantity(1).room(r20)
                                                                        .build()));

                                        // Room 21-25: FAMILY
                                        Room r21 = createRoom("501", savedTypes.get(4), 5, "2 phòng ngủ liên thông.",
                                                        4);
                                        r21.setBeds(Arrays.asList(Bed.builder().type(BedType.DOUBLE).quantity(2)
                                                        .room(r21).build()));

                                        Room r22 = createRoom("502", savedTypes.get(4), 5, "Bếp mini + phòng khách.",
                                                        5);
                                        r22.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.QUEEN).quantity(1).room(r22).build(),
                                                        Bed.builder().type(BedType.DOUBLE).quantity(1).room(r22)
                                                                        .build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r22)
                                                                        .build()));

                                        Room r23 = createRoom("503", savedTypes.get(4), 5, "Khu vui chơi trẻ em.", 4);
                                        r23.setBeds(Arrays.asList(Bed.builder().type(BedType.DOUBLE).quantity(2)
                                                        .room(r23).build()));

                                        Room r24 = createRoom("504", savedTypes.get(4), 5, "3 phòng ngủ.", 6);
                                        r24.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r24).build(),
                                                        Bed.builder().type(BedType.DOUBLE).quantity(2).room(r24)
                                                                        .build()));

                                        Room r25 = createRoom("505", savedTypes.get(4), 5, "2 toilet riêng.", 5);
                                        r25.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r25).build(),
                                                        Bed.builder().type(BedType.DOUBLE).quantity(1).room(r25)
                                                                        .build(),
                                                        Bed.builder().type(BedType.BUNK).quantity(1).room(r25)
                                                                        .build()));

                                        // Room 26-30: SUITE
                                        Room r26 = createRoom("601", savedTypes.get(5), 6, "Jacuzzi, butler 24/7.", 2);
                                        r26.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r26).build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r26)
                                                                        .build()));

                                        Room r27 = createRoom("602", savedTypes.get(5), 6, "Honeymoon Suite.", 2);
                                        r27.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(1).room(r27)
                                                        .build()));

                                        Room r28 = createRoom("603", savedTypes.get(5), 6, "Presidential Suite.", 4);
                                        r28.setBeds(Arrays.asList(Bed.builder().type(BedType.KING).quantity(2).room(r28)
                                                        .build()));

                                        Room r29 = createRoom("604", savedTypes.get(5), 6, "Penthouse tầng thượng.", 2);
                                        r29.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r29).build(),
                                                        Bed.builder().type(BedType.SOFA).quantity(1).room(r29)
                                                                        .build()));

                                        Room r30 = createRoom("605", savedTypes.get(5), 6,
                                                        "Thiết kế tối giản sang trọng.", 3);
                                        r30.setBeds(Arrays.asList(
                                                        Bed.builder().type(BedType.KING).quantity(1).room(r30).build(),
                                                        Bed.builder().type(BedType.EXTRA).quantity(1).room(r30)
                                                                        .build()));

                                        roomsToSave.addAll(Arrays.asList(r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11,
                                                        r12, r13, r14, r15, r16, r17, r18, r19, r20, r21, r22, r23, r24,
                                                        r25, r26, r27, r28, r29, r30));
                                        roomRepo.saveAll(roomsToSave);
                                }
                        }
                };
        }
}
