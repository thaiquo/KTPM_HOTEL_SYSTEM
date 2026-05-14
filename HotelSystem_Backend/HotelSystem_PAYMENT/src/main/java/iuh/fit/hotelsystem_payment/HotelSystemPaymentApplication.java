package iuh.fit.hotelsystem_payment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class HotelSystemPaymentApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelSystemPaymentApplication.class, args);
    }

}
