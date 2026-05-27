package iuh.fit.hotelsystem_room.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

import javax.sql.DataSource;

@Configuration
public class DataSeeder {

    @Bean
    @ConditionalOnProperty(name = "room.seed.enabled", havingValue = "true")
    CommandLineRunner initRoom(DataSource dataSource) {
        return args -> {
            System.out.println(">>> Starting ROOM service data seeding from data.sql...");
            ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
            populator.addScript(new ClassPathResource("data.sql"));
            populator.execute(dataSource);
            System.out.println(">>> ROOM service data seeding completed successfully!");
        };
    }
}
