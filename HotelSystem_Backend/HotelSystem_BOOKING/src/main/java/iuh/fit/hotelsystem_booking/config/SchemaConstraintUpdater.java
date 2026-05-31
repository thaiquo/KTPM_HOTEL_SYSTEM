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
        updateBookingInvoiceLinesJsonColumn();
        updateOutboxEventColumns();
        ensureOutboxDlqTable();

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

    private void updateOutboxEventColumns() {
        try {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS outbox_event ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0");
            jdbcTemplate.execute("ALTER TABLE IF EXISTS outbox_event ADD COLUMN IF NOT EXISTS last_error text");
            log.info("Ensured outbox_event attempts and last_error columns exist");
        } catch (Exception ex) {
            log.warn("Skip updating outbox_event columns due to error: {}", ex.getMessage());
        }
    }

    private void ensureOutboxDlqTable() {
        try {
            String sql = "CREATE TABLE IF NOT EXISTS outbox_event_dlq ("
                    + "id serial PRIMARY KEY,"
                    + "aggregate_type varchar(100),"
                    + "aggregate_id varchar(100),"
                    + "type varchar(200),"
                    + "payload text,"
                    + "headers jsonb,"
                    + "occurred_at timestamp,"
                    + "attempts integer,"
                    + "last_error text,"
                    + "moved_at timestamp DEFAULT now()"
                    + ")";
            jdbcTemplate.execute(sql);
            log.info("Ensured outbox_event_dlq table exists");
        } catch (Exception ex) {
            log.warn("Skip creating outbox_event_dlq due to error: {}", ex.getMessage());
        }
    }

    private void updateBookingInvoiceLinesJsonColumn() {
        try {
            jdbcTemplate.execute("ALTER TABLE IF EXISTS booking_invoices ALTER COLUMN lines_json TYPE TEXT USING lines_json::TEXT");
            log.info("Updated booking_invoices.lines_json column to TEXT");
        } catch (Exception ex) {
            log.warn("Skip updating booking_invoices.lines_json column due to error: {}", ex.getMessage());
        }
    }
}
