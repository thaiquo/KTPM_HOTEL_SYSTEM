package iuh.fit.hotelsystem_booking.service;



import iuh.fit.hotelsystem_booking.config.TimeConfig;

import iuh.fit.hotelsystem_booking.dto.CheckInCheckOutStatsDto;

import iuh.fit.hotelsystem_booking.entity.Booking;

import iuh.fit.hotelsystem_booking.entity.BookingStatus;

import iuh.fit.hotelsystem_booking.repository.BookingRepository;

import org.springframework.stereotype.Service;



import java.time.LocalDate;

import java.time.LocalDateTime;

import java.time.ZonedDateTime;

import java.util.List;

import java.util.stream.Collectors;



/**

 * Service tính toán thống kê check-in/checkout cho staff

 */

@Service

public class StaffCheckInOutStatsService {



    private static final List<BookingStatus> CHECK_IN_READY_STATUSES =

            List.of(BookingStatus.DEPOSIT_PAID, BookingStatus.CONFIRMED);



    private static final List<BookingStatus> CHECK_OUT_PENDING_STATUSES =

            List.of(BookingStatus.CHECKED_IN, BookingStatus.CHECKOUT_PENDING_PAYMENT);



    private static final List<BookingStatus> CHECK_OUT_DONE_STATUSES =

            List.of(BookingStatus.COMPLETED, BookingStatus.CHECKED_OUT);



    private static final List<BookingStatus> ALREADY_CHECKED_IN_STATUSES =

            List.of(BookingStatus.CHECKED_IN, BookingStatus.CHECKOUT_PENDING_PAYMENT,

                    BookingStatus.COMPLETED, BookingStatus.CHECKED_OUT);



    private final BookingRepository bookingRepository;



    public StaffCheckInOutStatsService(BookingRepository bookingRepository) {

        this.bookingRepository = bookingRepository;

    }



    public LocalDate todayInVietnam() {

        return ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDate();

    }



    /**

     * Booking cần check-in đến hạn ngày {@code date} (gồm quá hạn chưa check-in).

     */

    public List<Booking> getCheckInList(LocalDate date) {

        if (date == null) {

            return bookingRepository.findPendingCheckInAll(CHECK_IN_READY_STATUSES);

        }

        return bookingRepository.findPendingCheckInOnOrBefore(date, CHECK_IN_READY_STATUSES);

    }



    public List<Booking> getTodayCheckInList() {

        return getCheckInList(todayInVietnam());

    }



    /**

     * Booking đang lưu trú, đến hạn checkout ngày {@code date} (gồm quá hạn chưa checkout).

     */

    public List<Booking> getCheckOutList(LocalDate date) {

        if (date == null) {

            return bookingRepository.findPendingCheckOutAll(CHECK_OUT_PENDING_STATUSES);

        }

        return bookingRepository.findPendingCheckOutOnOrBefore(date, CHECK_OUT_PENDING_STATUSES);

    }



    public List<Booking> getTodayCheckOutList() {

        return getCheckOutList(todayInVietnam());

    }



    /**

     * Booking đã check-in (ngày check-in = date).

     */

    public List<Booking> getAlreadyCheckedInList(LocalDate date) {

        if (date == null) {

            return bookingRepository.findByStatusInOrderByCheckInAsc(ALREADY_CHECKED_IN_STATUSES);

        }

        return bookingRepository.findActuallyCheckedInOnDate(

                date.atStartOfDay(),

                date.plusDays(1).atStartOfDay(),

                ALREADY_CHECKED_IN_STATUSES

        );

    }



    public List<Booking> getAlreadyCheckedInTodayList() {

        return getAlreadyCheckedInList(todayInVietnam());

    }



    /**

     * Booking đã checkout trong ngày.

     */

    public List<Booking> getAlreadyCheckedOutList(LocalDate date) {

        if (date == null) {

            List<Booking> list = bookingRepository.findCompletedCheckOutAll(CHECK_OUT_DONE_STATUSES);
            list.addAll(bookingRepository.findLegacyEarlyCheckoutAll());
            return list;

        }

        List<Booking> list = bookingRepository.findCompletedCheckOutOnDate(

                date,

                date.atStartOfDay(),

                date.plusDays(1).atStartOfDay(),

                CHECK_OUT_DONE_STATUSES

        );
        list.addAll(bookingRepository.findLegacyEarlyCheckoutOnDate(
                date,
                date.atStartOfDay(),
                date.plusDays(1).atStartOfDay()
        ));
        return list;

    }



    public List<Booking> getAlreadyCheckedOutTodayList() {

        return getAlreadyCheckedOutList(todayInVietnam());

    }



    /**

     * Thống kê đồng bộ với danh sách hiển thị trên UI.

     */

    public CheckInCheckOutStatsDto getStats(LocalDate date) {

        List<Booking> pendingCheckInRaw = getCheckInList(date);
        
        // Chỉ tính là "Chưa check-in" nếu vẫn còn trong hạn lưu trú (checkOut >= date)
        List<Booking> pendingCheckIn = pendingCheckInRaw.stream()
            .filter(b -> b.getCheckOut() != null && !b.getCheckOut().isBefore(date))
            .collect(Collectors.toList());

        List<Booking> checkedInToday = getAlreadyCheckedInList(date);

        long checkedInTodayCount = bookingRepository.countActuallyCheckedInOnDate(

                date.atStartOfDay(),

                date.plusDays(1).atStartOfDay(),

                ALREADY_CHECKED_IN_STATUSES

        );

        List<Booking> pendingCheckOut = getCheckOutList(date);

        List<Booking> checkedOutToday = getAlreadyCheckedOutList(date);



        LocalDateTime now = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime();

        List<Booking> inCleaning = bookingRepository.findByCleaningStartAtIsNotNullAndCleaningEndAtIsNotNull();

        long inCleaningNow = inCleaning.stream()

            .filter(b -> b.getCleaningStartAt() != null && b.getCleaningEndAt() != null)

            .filter(b -> b.getCleaningStartAt().isBefore(now) && b.getCleaningEndAt().isAfter(now))

            .count();



        return CheckInCheckOutStatsDto.builder()

            .totalCheckInToday((long) pendingCheckIn.size() + checkedInTodayCount)

            .alreadyCheckedIn(checkedInTodayCount)

            .notYetCheckedIn((long) pendingCheckIn.size())

            .totalCheckOutToday((long) pendingCheckOut.size() + checkedOutToday.size())

            .alreadyCheckedOut((long) checkedOutToday.size())

            .notYetCheckedOut((long) pendingCheckOut.size())

            .inCleaningNow(inCleaningNow)

            .build();

    }



    public CheckInCheckOutStatsDto getTodayStats() {

        return getStats(todayInVietnam());

    }



    public List<Long> getTodayCheckInRoomIds() {

        return getTodayCheckInList().stream()

            .map(Booking::getRoomId)

            .distinct()

            .collect(Collectors.toList());

    }



    public List<Long> getTodayCheckOutRoomIds() {

        return getTodayCheckOutList().stream()

            .map(Booking::getRoomId)

            .distinct()

            .collect(Collectors.toList());

    }

}

