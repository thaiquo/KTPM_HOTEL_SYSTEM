package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.dto.BookingCreateRequest;
import iuh.fit.hotelsystem_booking.dto.BookingModificationRequest;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    private final BookingValidator bookingValidator;
    private final PricingService pricingService;
    private final CheckInOutService checkInOutService;
    private final BookingGuestService bookingGuestService;

    public BookingService(BookingRepository bookingRepository,
                          RabbitTemplate rabbitTemplate,
                          BookingValidator bookingValidator,
                          PricingService pricingService,
                          CheckInOutService checkInOutService,
                          BookingGuestService bookingGuestService) {
        this.bookingRepository = bookingRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingValidator = bookingValidator;
        this.pricingService = pricingService;
        this.checkInOutService = checkInOutService;
        this.bookingGuestService = bookingGuestService;
    }

    // ===============================
    // CREATE BOOKING
    // ===============================
    public Booking createBooking(Booking booking) {
        // 1. Validate input
        bookingValidator.validate(booking);

        // 2. Calculate Pricing
        RatePlan ratePlan = booking.getRatePlan() != null ? booking.getRatePlan() : RatePlan.FLEXIBLE;
        iuh.fit.hotelsystem_booking.dto.PricingResult priceResult = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(), booking.getPricePerNight(), ratePlan);

        // 3. Set booking details
        booking.setNights(priceResult.getNights());
        booking.setBaseTotal(priceResult.getBaseTotal());
        booking.setPriceMultiplier(priceResult.getPriceMultiplier());
        booking.setFinalTotal(priceResult.getFinalTotal());
        booking.setDepositAmount(priceResult.getDepositAmount());
        booking.setIsHolidayBooking(priceResult.isHolidayBooking());
        booking.setRatePlan(ratePlan);
        booking.setDiscountPercent(priceResult.getDiscountPercent());
        booking.setRefundable(priceResult.isRefundable());
        booking.setAllowModification(priceResult.isAllowModification());
        booking.setNonRefundable(!priceResult.isRefundable());
        
        // Mặc định là thanh toán FULL nếu không chỉ định, hoặc lấy từ request nếu sau này mở rộng
        if (booking.getPaymentType() == null || booking.getPaymentType().isBlank()) {
            booking.setPaymentType(priceResult.getPaymentType());
        }
        if (ratePlan == RatePlan.NON_REFUNDABLE
                && !iuh.fit.hotelsystem_booking.constants.BookingConstants.PAYMENT_TYPE_FULL.equals(booking.getPaymentType())) {
            throw new IllegalArgumentException("NON_REFUNDABLE rate plan requires full payment");
        }
        if (booking.getPaymentStatus() == null) {
            booking.setPaymentStatus("PENDING");
        }

        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setCreatedAt(LocalDateTime.now());
        
        // 4. Set Hold Expiry (11 minutes = VNPAY 10m + 1m buffer)
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(iuh.fit.hotelsystem_booking.constants.BookingConstants.HOLD_MINUTES));

        Booking saved = bookingRepository.save(booking);

        // 5. Gửi HOLD ROOM
        RoomMessage msg = new RoomMessage();
        msg.setBookingId(saved.getId());
        msg.setRoomId(saved.getRoomId());

        try {
            rabbitTemplate.convertAndSend(
                    RabbitConfig.EXCHANGE,
                    "room.hold",
                    msg
            );
        } catch (Exception ex) {
            log.warn("Could not publish room hold event. bookingId={}, roomId={}, reason={}",
                    saved.getId(), saved.getRoomId(), ex.getMessage());
        }

        return saved;
    }

    @Transactional
    public Booking createBooking(BookingCreateRequest request) {
        Booking booking = new Booking();
        booking.setRoomId(request.getRoomId());
        booking.setUserId(request.getUserId());
        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        booking.setPricePerNight(request.getPricePerNight());
        booking.setPaymentType(request.getPaymentType());
        booking.setRatePlan(parseRatePlan(request.getRatePlan()));
        booking.setGuestCount(request.getGuestCount());
        booking.setRoomCapacitySnapshot(request.getRoomCapacitySnapshot());

        List<BookingGuest> guests = bookingGuestService.validateAndBuildGuests(
                request.getPrimaryGuest(),
                request.getGuests(),
                request.getCheckIn(),
                request.getGuestCount(),
                request.getRoomCapacitySnapshot());

        Booking saved = createBooking(booking);
        List<BookingGuest> savedGuests = bookingGuestService.saveGuests(saved.getId(), guests);
        savedGuests.stream()
                .filter(guest -> Boolean.TRUE.equals(guest.getPrimaryGuest()))
                .findFirst()
                .ifPresent(guest -> saved.setPrimaryGuestId(guest.getId()));
        saved.setPreCheckinCompleted(false);
        saved.setGuestCount(savedGuests.size());
        return bookingRepository.save(saved);
    }

    // ===============================
    // GET BOOKING
    // ===============================
    public Booking getBooking(Long id) {
        Booking booking = bookingRepository.findById(id).orElseThrow();
        return normalizePaidBooking(booking);
    }

    // ===============================
    // LIST BOOKINGS BY USER
    // ===============================
    public List<Booking> getBookingsByUserId(Long userId) {
        return bookingRepository.findByUserId(userId)
                .stream()
                .map(this::normalizePaidBooking)
                .toList();
    }

    private Booking normalizePaidBooking(Booking booking) {
        if (booking == null || booking.getStatus() == null) {
            return booking;
        }

        double paidAmount = booking.getPaidAmount() != null ? booking.getPaidAmount() : 0.0;
        if (paidAmount > 0.0) {
            return booking;
        }

        if (booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.COMPLETED) {
            booking.setPaidAmount(valueOrZero(booking.getFinalTotal()));
            if (isMissingOrPendingPaymentStatus(booking.getPaymentStatus())) {
                booking.setPaymentStatus("PAID");
            }
        } else if (booking.getStatus() == BookingStatus.DEPOSIT_PAID) {
            booking.setPaidAmount(valueOrZero(booking.getDepositAmount()));
            if (isMissingOrPendingPaymentStatus(booking.getPaymentStatus())) {
                booking.setPaymentStatus("DEPOSITED");
            }
        }

        return booking;
    }

    private boolean isMissingOrPendingPaymentStatus(String paymentStatus) {
        return paymentStatus == null
                || paymentStatus.isBlank()
                || "PENDING".equalsIgnoreCase(paymentStatus)
                || "UNPAID".equalsIgnoreCase(paymentStatus);
    }

    private double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }

    public List<BookingGuest> getGuests(Long bookingId) {
        return bookingGuestService.getGuests(bookingId);
    }

    public BookingGuest updateGuest(Long bookingId, Long guestId, iuh.fit.hotelsystem_booking.dto.GuestRequest request) {
        return bookingGuestService.updateGuest(bookingId, guestId, request);
    }

    @Transactional
    public Booking modifyBooking(Long bookingId, BookingModificationRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (!Boolean.TRUE.equals(booking.getAllowModification())) {
            throw new IllegalStateException("This rate plan does not allow booking modification");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new IllegalStateException("Booking cannot be modified with current status: " + booking.getStatus());
        }
        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        if (request.getPricePerNight() != null && request.getPricePerNight() > 0) {
            booking.setPricePerNight(request.getPricePerNight());
        }

        iuh.fit.hotelsystem_booking.dto.PricingResult priceResult = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(), booking.getPricePerNight(), booking.getRatePlan());
        booking.setNights(priceResult.getNights());
        booking.setBaseTotal(priceResult.getBaseTotal());
        booking.setPriceMultiplier(priceResult.getPriceMultiplier());
        booking.setFinalTotal(priceResult.getFinalTotal());
        booking.setDepositAmount(priceResult.getDepositAmount());
        booking.setDiscountPercent(priceResult.getDiscountPercent());
        return bookingRepository.save(booking);
    }

    private RatePlan parseRatePlan(String value) {
        if (value == null || value.isBlank()) {
            return RatePlan.FLEXIBLE;
        }
        return RatePlan.valueOf(value);
    }

    // ===============================
    // GET BOOKED ROOM IDS
    // ===============================
    public List<Long> getBookedRoomIds(LocalDate checkIn, LocalDate checkOut) {
        return bookingRepository.findBookedRoomIds(checkIn, checkOut);
    }

    // ===============================
    // CHECK-IN
    // ===============================
    public Booking checkIn(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.DEPOSIT_PAID) {
            // Tính phí check-in sớm nếu có
            double earlyFee = checkInOutService.calculateEarlyCheckInFee(booking, LocalDateTime.now());
            if (earlyFee > 0) {
                // Trong thực tế sẽ tạo một khoản thu thêm (Extra charge)
                System.out.println("Early check-in fee: " + earlyFee);
            }

            booking.setStatus(BookingStatus.CHECKED_IN);
            return bookingRepository.save(booking);
        }

        throw new IllegalStateException("Booking cannot be checked in with current status: " + booking.getStatus());
    }

    // ===============================
    // CHECK-OUT
    // ===============================
    public Booking checkOut(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow();

        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            double lateFee = checkInOutService.calculateLateCheckOutFee(booking, LocalDateTime.now());
            if (lateFee > 0) {
                System.out.println("Late check-out fee: " + lateFee);
            }

            booking.setStatus(BookingStatus.COMPLETED);
            return bookingRepository.save(booking);
        }

        throw new IllegalStateException("Booking cannot be checked out with current status: " + booking.getStatus());
    }
}
