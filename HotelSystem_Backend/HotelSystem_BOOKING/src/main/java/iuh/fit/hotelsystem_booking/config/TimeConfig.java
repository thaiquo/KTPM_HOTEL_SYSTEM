package iuh.fit.hotelsystem_booking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
public class TimeConfig {

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    @Bean
    public Clock vietnamClock() {
        return Clock.system(VIETNAM_ZONE);
    }
}

