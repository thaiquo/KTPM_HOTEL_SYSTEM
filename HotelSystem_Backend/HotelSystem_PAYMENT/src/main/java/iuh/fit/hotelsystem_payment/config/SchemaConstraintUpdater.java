package iuh.fit.hotelsystem_payment.config;

import iuh.fit.hotelsystem_payment.entity.PaymentType;
import iuh.fit.hotelsystem_payment.entity.PaymentStatus;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(prefix = "payment.schema", name = "auto-update-constraints", havingValue = "true")
public class SchemaConstraintUpdater {

    private static final Logger log = LoggerFactory.getLogger(SchemaConstraintUpdater.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaConstraintUpdater(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @PostConstruct
    public void updatePaymentConstraints() {
        try {
            String allowedTypes = Arrays.stream(PaymentType.values())
                    .map(Enum::name)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(","));

            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_payment_type_check");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type in (" + allowedTypes + "))");
            log.info("Updated payments_payment_type_check with allowed types: {}", allowedTypes);

            String allowedStatuses = Arrays.stream(PaymentStatus.values())
                    .map(Enum::name)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(","));

            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_status_check");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments ADD CONSTRAINT payments_status_check CHECK (status in (" + allowedStatuses + "))");
            log.info("Updated payments_status_check with allowed statuses: {}", allowedStatuses);
        } catch (Exception ex) {
            log.warn("Skip updating payments constraints due to error: {}", ex.getMessage());
        }
    }
}

