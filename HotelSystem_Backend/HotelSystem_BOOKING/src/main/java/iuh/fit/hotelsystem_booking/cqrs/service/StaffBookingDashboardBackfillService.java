package iuh.fit.hotelsystem_booking.cqrs.service;

import iuh.fit.hotelsystem_booking.cqrs.repository.StaffBookingDashboardReadModelRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StaffBookingDashboardBackfillService {

    private static final Logger log = LoggerFactory.getLogger(StaffBookingDashboardBackfillService.class);
    private static final int BACKFILL_LIMIT = 500;

    private final StaffBookingDashboardReadModelRepository staffBookingReadRepository;
    private final BookingRepository bookingRepository;
    private final BookingReadModelProjector projector;

    public StaffBookingDashboardBackfillService(StaffBookingDashboardReadModelRepository staffBookingReadRepository,
                                                BookingRepository bookingRepository,
                                                BookingReadModelProjector projector) {
        this.staffBookingReadRepository = staffBookingReadRepository;
        this.bookingRepository = bookingRepository;
        this.projector = projector;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void backfillIfEmpty() {
        if (staffBookingReadRepository.count() > 0) {
            return;
        }
        bookingRepository.findAllByOrderByCreatedAtDesc().stream()
                .limit(BACKFILL_LIMIT)
                .forEach(projector::projectStaffBooking);
        log.info("Backfilled staff booking dashboard read model. limit={}", BACKFILL_LIMIT);
    }
}
