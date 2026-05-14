package iuh.fit.hotelsystem_booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.cloud.openfeign.EnableFeignClients;

import org.springframework.context.annotation.Bean;
@SpringBootApplication
@EnableScheduling
@EnableFeignClients
public class HotelSystemBookingApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelSystemBookingApplication.class, args);
    }
}
