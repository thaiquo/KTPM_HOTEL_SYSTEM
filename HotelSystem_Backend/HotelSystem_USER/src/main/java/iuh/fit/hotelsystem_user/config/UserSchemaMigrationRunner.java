package iuh.fit.hotelsystem_user.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserSchemaMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public UserSchemaMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("""
                update users
                   set email = lower(trim(email)),
                       phone_number = trim(phone_number)
                 where email is not null
                    or phone_number is not null
                """);

        jdbcTemplate.execute("""
                delete from users u
                using users d
                where u.id > d.id
                  and lower(u.email) = lower(d.email)
                """);

        jdbcTemplate.execute("""
                delete from users u
                using users d
                where u.id > d.id
                  and u.phone_number = d.phone_number
                """);

        jdbcTemplate.execute("""
                create unique index if not exists ux_users_email_lower
                on users (lower(email))
                """);

        jdbcTemplate.execute("""
                create unique index if not exists ux_users_phone_number
                on users (phone_number)
                """);
    }
}
