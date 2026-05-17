package iuh.fit.hotelsystem_booking.config;

import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

/**
 * Tạo booking mẫu cho màn staff check-in/checkout khi DB chưa có dữ liệu phù hợp.
 * Bật: app.staff-demo.seed=true (mặc định trong docker-compose.dev.yml).
 */
@Component
@ConditionalOnProperty(name = "app.staff-demo.seed", havingValue = "true")
public class StaffDemoBookingSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StaffDemoBookingSeeder.class);

    private static final List<BookingStatus> CHECK_IN_READY =
            List.of(BookingStatus.DEPOSIT_PAID, BookingStatus.CONFIRMED);

    private static final List<BookingStatus> CHECK_OUT_PENDING =
            List.of(BookingStatus.CHECKED_IN, BookingStatus.CHECKOUT_PENDING_PAYMENT);

    private final BookingRepository bookingRepository;

    public StaffDemoBookingSeeder(BookingRepository bookingRepository) {
        this.bookingRepository = bookingRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        LocalDate today = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDate();

        if (bookingRepository.findPendingCheckInOnOrBefore(today, CHECK_IN_READY).isEmpty()) {
            Booking checkIn = baseBooking(today, today.plusDays(2), 1L, 4L);
            checkIn.setStatus(BookingStatus.CONFIRMED);
            checkIn.setPaymentStatus("PAID");
            checkIn.setPaidAmount(checkIn.getFinalTotal());
            bookingRepository.save(checkIn);
            log.info("Staff demo: created check-in booking #{} (room 1, check-in {})", checkIn.getId(), today);
        }

        if (bookingRepository.findPendingCheckOutOnOrBefore(today, CHECK_OUT_PENDING).isEmpty()) {
            Booking checkout = baseBooking(today.minusDays(1), today, 2L, 4L);
            checkout.setStatus(BookingStatus.CHECKED_IN);
            checkout.setPaymentStatus("PAID");
            checkout.setPaidAmount(checkout.getFinalTotal());
            checkout.setActualCheckInAt(today.minusDays(1).atTime(14, 0));
            bookingRepository.save(checkout);
            log.info("Staff demo: created checkout booking #{} (room 2, check-out {})", checkout.getId(), today);
        }
    }

    private static Booking baseBooking(LocalDate checkIn, LocalDate checkOut, long roomId, long userId) {
        Booking booking = new Booking();
        booking.setRoomId(roomId);
        booking.setUserId(userId);
        booking.setCheckIn(checkIn);
        booking.setCheckOut(checkOut);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setRatePlan(RatePlan.FLEXIBLE);
        booking.setPricePerNight(1_500_000.0);
        booking.setNights(Math.max(1, (int) (checkOut.toEpochDay() - checkIn.toEpochDay())));
        booking.setBaseTotal(booking.getNights() * booking.getPricePerNight());
        booking.setPriceMultiplier(1.0);
        booking.setFinalTotal(booking.getBaseTotal());
        booking.setDepositAmount(booking.getFinalTotal() * 0.5);
        booking.setPaymentType("DEPOSIT");
        booking.setPaymentStatus("DEPOSITED");
        booking.setPaidAmount(booking.getDepositAmount());
        booking.setDiscountPercent(0);
        booking.setRefundable(true);
        booking.setAllowModification(true);
        booking.setNonRefundable(false);
        booking.setIsHolidayBooking(false);
        booking.setGuestCount(2);
        return booking;
    }
}
