package iuh.fit.hotelsystem_room;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class HotelSystemRoomApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelSystemRoomApplication.class, args);
    }
}
