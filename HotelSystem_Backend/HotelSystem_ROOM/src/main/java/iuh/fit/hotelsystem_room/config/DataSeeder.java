package iuh.fit.hotelsystem_room.config;

import iuh.fit.hotelsystem_room.entity.Room;
import iuh.fit.hotelsystem_room.entity.enums.RoomStatus;
import iuh.fit.hotelsystem_room.entity.enums.RoomType;
import iuh.fit.hotelsystem_room.repository.RoomRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(RoomRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                Room r1 = Room.builder()
                        .name("Phòng Standard 101")
                        .type(RoomType.STANDARD)
                        .price(500000.0)
                        .capacity(2)
                        .description("Phòng tiêu chuẩn đầy đủ tiện nghi.")
                        .area(25.0)
                        .bedType("Double")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi", "Điều hòa"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1631049307264-da0ec9d70304"))
                        .build();

                Room r2 = Room.builder()
                        .name("Phòng Deluxe 202")
                        .type(RoomType.DELUXE)
                        .price(1200000.0)
                        .capacity(3)
                        .description("Phòng Deluxe sang trọng với view đẹp.")
                        .area(45.0)
                        .bedType("Queen")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi", "Điều hòa", "Bồn tắm"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1618773928121-c32242e63f39"))
                        .build();

                Room r3 = Room.builder()
                        .name("Phòng Superior 303")
                        .type(RoomType.SUPERIOR)
                        .price(1800000.0)
                        .capacity(2)
                        .description("Phòng Superior với nội thất hiện đại.")
                        .area(35.0)
                        .bedType("Queen")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi", "Điều hòa", "Minibar"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1566665797739-1674de7a421a"))
                        .build();

                Room r4 = Room.builder()
                        .name("Phòng VIP 404")
                        .type(RoomType.VIP)
                        .price(5000000.0)
                        .capacity(2)
                        .description("Phòng VIP dành cho khách hàng đặc biệt.")
                        .area(60.0)
                        .bedType("King")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi 4K", "Điều hòa", "Jacuzzi", "Dịch vụ 24/7"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1590490360182-c33d57733427"))
                        .build();

                Room r5 = Room.builder()
                        .name("Phòng Family 505")
                        .type(RoomType.FAMILY)
                        .price(2500000.0)
                        .capacity(5)
                        .description("Phòng gia đình rộng rãi, tiện nghi cho cả nhà.")
                        .area(70.0)
                        .bedType("2 Double + 1 Single")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi", "Điều hòa", "Bếp nhỏ", "Bàn ăn"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1584132967334-10e028bd69f7"))
                        .build();

                Room r6 = Room.builder()
                        .name("Phòng Suite 606")
                        .type(RoomType.SUITE)
                        .price(8000000.0)
                        .capacity(4)
                        .description("Phòng Suite cao cấp nhất, diện tích cực lớn.")
                        .area(100.0)
                        .bedType("2 King")
                        .status(RoomStatus.AVAILABLE)
                        .amenities(Arrays.asList("Wifi", "Tivi", "Điều hòa", "Bể bơi riêng", "Phòng khách riêng"))
                        .images(Arrays.asList("https://images.unsplash.com/photo-1578683010236-d716f9a3f461"))
                        .build();

                repository.saveAll(List.of(r1, r2, r3, r4, r5, r6));
                System.out.println(">> Seeded 6 types of Sample Room Data Successfully!");
            }
        };
    }
}
