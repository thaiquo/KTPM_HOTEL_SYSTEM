package iuh.fit.hotelsystem_auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication(
        exclude = { UserDetailsServiceAutoConfiguration.class }
)
@EnableFeignClients
public class HotelSystemAuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelSystemAuthApplication.class, args);
    }
}
