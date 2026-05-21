package iuh.fit.hotelsystem_booking.config;

import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
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
@ConditionalOnProperty(prefix = "booking.schema", name = "auto-update-constraints", havingValue = "true")
public class SchemaConstraintUpdater {

    private static final Logger log = LoggerFactory.getLogger(SchemaConstraintUpdater.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaConstraintUpdater(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @PostConstruct
    public void updateBookingStatusCheckConstraint() {
        try {
            String allowed = Arrays.stream(BookingStatus.values())
                    .map(Enum::name)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(","));

            jdbcTemplate.execute("ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_status_check");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS bookings ADD CONSTRAINT bookings_status_check CHECK (status in (" + allowed + "))");
            log.info("Updated bookings_status_check with allowed statuses: {}", allowed);
        } catch (Exception ex) {
            log.warn("Skip updating bookings_status_check due to error: {}", ex.getMessage());
        }

        try {
            String allowedRefundStatuses = Arrays.stream(RefundStatus.values())
                    .map(Enum::name)
                    .map(v -> "'" + v + "'")
                    .collect(Collectors.joining(","));

            jdbcTemplate.execute("ALTER TABLE IF EXISTS refund_transactions DROP CONSTRAINT IF EXISTS refund_transactions_status_check");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS refund_transactions ADD CONSTRAINT refund_transactions_status_check CHECK (status in (" + allowedRefundStatuses + "))");
            log.info("Updated refund_transactions_status_check with allowed statuses: {}", allowedRefundStatuses);
        } catch (Exception ex) {
            log.warn("Skip updating refund_transactions_status_check due to error: {}", ex.getMessage());
        }
    }
}
