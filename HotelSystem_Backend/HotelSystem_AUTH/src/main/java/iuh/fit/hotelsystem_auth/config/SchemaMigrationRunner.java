package iuh.fit.hotelsystem_auth.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public SchemaMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private boolean tableExists(String tableName) {
        Boolean exists = jdbcTemplate.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ?)",
                Boolean.class,
                tableName);
        return Boolean.TRUE.equals(exists);
    }

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE
                """);

        jdbcTemplate.execute("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS gender VARCHAR(50)
                """);

        jdbcTemplate.execute("""
                ALTER TABLE registration_sessions
                ADD COLUMN IF NOT EXISTS gender VARCHAR(50)
                """);

        jdbcTemplate.execute(
                """
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_name = 'users'
                                  AND column_name = 'gender'
                                  AND data_type <> 'boolean'
                            ) THEN
                                ALTER TABLE users
                                ALTER COLUMN gender TYPE BOOLEAN
                                USING CASE
                                    WHEN lower(coalesce(gender::text, '')) IN ('male', 'm', 'nam', 'true', '1', 'yes') THEN TRUE
                                    WHEN lower(coalesce(gender::text, '')) IN ('female', 'f', 'nu', 'false', '0', 'no') THEN FALSE
                                    ELSE NULL
                                END;
                            END IF;
                        END $$;
                        """);

        jdbcTemplate.execute(
                """
                        DO $$
                        BEGIN
                            IF EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_name = 'registration_sessions'
                                  AND column_name = 'gender'
                                  AND data_type <> 'boolean'
                            ) THEN
                                ALTER TABLE registration_sessions
                                ALTER COLUMN gender TYPE BOOLEAN
                                USING CASE
                                    WHEN lower(coalesce(gender::text, '')) IN ('male', 'm', 'nam', 'true', '1', 'yes') THEN TRUE
                                    WHEN lower(coalesce(gender::text, '')) IN ('female', 'f', 'nu', 'false', '0', 'no') THEN FALSE
                                    ELSE NULL
                                END;
                            END IF;
                        END $$;
                        """);
    }
}