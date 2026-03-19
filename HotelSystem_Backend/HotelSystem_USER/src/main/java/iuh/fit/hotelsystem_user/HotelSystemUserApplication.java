package iuh.fit.hotelsystem_user;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@SpringBootApplication(
    exclude = { UserDetailsServiceAutoConfiguration.class }
)
public class HotelSystemUserApplication {

    public static void main(String[] args) {
        SpringApplication.run(HotelSystemUserApplication.class, args);
    }

}
