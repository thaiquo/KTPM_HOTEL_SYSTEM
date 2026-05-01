package iuh.fit.hotelsystem_payment.config;

import iuh.fit.hotelsystem_payment.entity.PaymentType;
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
    public void updatePaymentTypeCheckConstraint() {
        try {
            String allowed = Arrays.stream(PaymentType.values())
                    .map(Enum::name)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(","));

            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_payment_type_check");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type in (" + allowed + "))");
            log.info("Updated payments_payment_type_check with allowed types: {}", allowed);
        } catch (Exception ex) {
            log.warn("Skip updating payments_payment_type_check due to error: {}", ex.getMessage());
        }
    }
}

