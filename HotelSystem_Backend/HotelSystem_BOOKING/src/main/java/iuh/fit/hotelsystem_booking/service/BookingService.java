package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingCreateRequest;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.BookingModificationRequest;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.CheckOutRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutResponse;
import iuh.fit.hotelsystem_booking.dto.ConfirmCheckinPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.GuestRequest;
import iuh.fit.hotelsystem_booking.dto.LateCheckoutPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.PaymentStatusResponse;
import iuh.fit.hotelsystem_booking.dto.PricingResult;
import iuh.fit.hotelsystem_booking.dto.RemainingPaymentRequest;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.LateCheckoutPaymentStatus;
import iuh.fit.hotelsystem_booking.entity.RatePlan;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Comparator;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);

    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final RabbitTemplate rabbitTemplate;
    private final BookingValidator bookingValidator;
    private final PricingService pricingService;
    private final CheckInOutService checkInOutService;
    private final BookingGuestService bookingGuestService;
    private final CheckoutService checkoutService;
    private final PaymentServiceClient paymentServiceClient;

    public BookingService(BookingRepository bookingRepository,
                          BookingStayRepository bookingStayRepository,
                          RabbitTemplate rabbitTemplate,
                          BookingValidator bookingValidator,
                          PricingService pricingService,
                          CheckInOutService checkInOutService,
                          BookingGuestService bookingGuestService,
                          CheckoutService checkoutService,
                          PaymentServiceClient paymentServiceClient) {
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingValidator = bookingValidator;
        this.pricingService = pricingService;
        this.checkInOutService = checkInOutService;
        this.bookingGuestService = bookingGuestService;
        this.checkoutService = checkoutService;
        this.paymentServiceClient = paymentServiceClient;
    }

    public Booking createBooking(Booking booking) {
        bookingValidator.validate(booking);
        if (bookingRepository.existsActiveOverlapForRoom(
                booking.getRoomId(), booking.getCheckIn(), booking.getCheckOut())) {
            throw new IllegalStateException("Room is not available for the selected dates");
        }

        RatePlan ratePlan = booking.getRatePlan() != null ? booking.getRatePlan() : RatePlan.FLEXIBLE;
        PricingResult priceResult = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(), booking.getPricePerNight(), ratePlan);

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

        if (booking.getPaymentType() == null || booking.getPaymentType().isBlank()) {
            booking.setPaymentType(priceResult.getPaymentType());
        }
        if (ratePlan == RatePlan.NON_REFUNDABLE
                && !BookingConstants.PAYMENT_TYPE_FULL.equals(booking.getPaymentType())) {
            throw new IllegalArgumentException("NON_REFUNDABLE rate plan requires full payment");
        }
        if (booking.getPaymentStatus() == null) {
            booking.setPaymentStatus("PENDING");
        }

        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setCreatedAt(LocalDateTime.now());
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(BookingConstants.HOLD_MINUTES));

        Booking saved = bookingRepository.save(booking);
        RoomMessage msg = new RoomMessage();
        msg.setBookingId(saved.getId());
        msg.setRoomId(saved.getRoomId());

        try {
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.hold", msg);
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

    public Booking getBooking(Long id) {
        return normalizePaidBooking(bookingRepository.findById(id).orElseThrow());
    }

    public List<Booking> getBookingsByUserId(Long userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(this::normalizePaidBooking)
                .toList();
    }

    public List<BookingGuest> getGuests(Long bookingId) {
        return bookingGuestService.getGuests(bookingId);
    }

    public BookingGuest updateGuest(Long bookingId, Long guestId, GuestRequest request) {
        return bookingGuestService.updateGuest(bookingId, guestId, request);
    }

    @Transactional
    public Booking modifyBooking(Long bookingId, BookingModificationRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (!Boolean.TRUE.equals(booking.getAllowModification())) {
            throw new IllegalStateException("This rate plan does not allow booking modification");
        }
        if (booking.getStatus() == BookingStatus.CANCELLED
                || booking.getStatus() == BookingStatus.CHECKED_IN
                || booking.getStatus() == BookingStatus.CHECKED_OUT
                || booking.getStatus() == BookingStatus.COMPLETED
                || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new IllegalStateException("Booking cannot be modified with current status: " + booking.getStatus());
        }

        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        if (request.getPricePerNight() != null && request.getPricePerNight() > 0) {
            booking.setPricePerNight(request.getPricePerNight());
        }

        PricingResult priceResult = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(), booking.getPricePerNight(), booking.getRatePlan());
        booking.setNights(priceResult.getNights());
        booking.setBaseTotal(priceResult.getBaseTotal());
        booking.setPriceMultiplier(priceResult.getPriceMultiplier());
        booking.setFinalTotal(priceResult.getFinalTotal());
        booking.setDepositAmount(priceResult.getDepositAmount());
        booking.setDiscountPercent(priceResult.getDiscountPercent());
        return bookingRepository.save(booking);
    }

    public List<Long> getBookedRoomIds(LocalDate checkIn, LocalDate checkOut) {
        return bookingRepository.findBookedRoomIds(checkIn, checkOut);
    }

    public List<Booking> getStaffCheckInList() {
        return bookingRepository.findByStatusInOrderByCheckInAsc(
                List.of(BookingStatus.CONFIRMED, BookingStatus.DEPOSIT_PAID));
    }

    public List<Booking> getStaffCheckoutList() {
        return bookingRepository.findByStatusInOrderByCheckInAsc(List.of(BookingStatus.CHECKED_IN)).stream()
                .map(this::withStayTimes)
                .toList();
    }

    public Booking checkIn(Long bookingId) {
        CheckInRequest request = new CheckInRequest();
        request.setStaffId(0L);
        request.setRepresentativeCccd("LEGACY");
        return checkIn(bookingId, request);
    }

    @Transactional
    public Booking checkIn(Long bookingId, CheckInRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.DEPOSIT_PAID) {
            throw new IllegalStateException("Booking cannot be checked in with current status: " + booking.getStatus());
        }

        LocalDateTime now = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime();
        if (booking.getCheckIn() != null && now.toLocalDate().isBefore(booking.getCheckIn())) {
            throw new IllegalStateException("Booking cannot be checked in before check-in date");
        }

        LocalDateTime standardCheckoutDateTime = booking.getCheckOut().atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        if (!now.isBefore(standardCheckoutDateTime)) {
            throw new IllegalStateException("Booking can no longer be checked in after the standard check-out time");
        }
        if (request == null || request.getStaffId() == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        BookingGuest representative = resolveCheckInRepresentative(booking, request, now.toLocalDate());

        PaymentStatusResponse paymentStatus = getPaymentStatus(bookingId);
        double localPaidAmount = valueOrZero(booking.getPaidAmount());
        double localRemainingAmount = Math.max(0.0, valueOrZero(booking.getFinalTotal()) - localPaidAmount);
        boolean paidInPaymentService = paymentStatus != null && "PAID".equalsIgnoreCase(paymentStatus.getStatus());
        boolean paidInBookingService = localPaidAmount > 0 && localRemainingAmount <= 0.01;
        if (!paidInPaymentService && !paidInBookingService) {
            double remaining = paymentStatus != null
                    ? valueOrZero(paymentStatus.getRemainingAmount())
                    : localRemainingAmount;
            throw new IllegalStateException("Invoice is not PAID. Remaining amount: " + remaining);
        }

        if (booking.getCheckIn() != null
                && now.toLocalDate().isEqual(booking.getCheckIn())
                && now.toLocalTime().isBefore(LocalTime.of(BookingConstants.CHECK_IN_HOUR, 0))) {
            double fee = checkInOutService.calculateEarlyCheckInFee(booking, now);
            if (fee > 0.01) {
                PaymentStatusResponse earlyFeeStatus = paymentServiceClient.getEarlyCheckinFeeStatus(bookingId);
                boolean earlyFeePaid = earlyFeeStatus != null && "PAID".equalsIgnoreCase(earlyFeeStatus.getStatus());
                if (!earlyFeePaid) {
                    LateCheckoutPaymentRequest feeRequest = new LateCheckoutPaymentRequest();
                    feeRequest.setBookingId(bookingId);
                    feeRequest.setUserId(booking.getUserId());
                    feeRequest.setAmount(fee);
                    paymentServiceClient.createEarlyCheckinFee(bookingId, feeRequest);
                    throw new IllegalStateException("Early check-in fee payment is required. Amount: " + fee);
                }
            }
        }

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElseGet(BookingStay::new);
        stay.setBookingId(bookingId);
        applyRepresentativeToStay(stay, representative, request);
        stay.setActualCheckInAt(now);
        stay.setCheckedInByStaffId(request.getStaffId());
        stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
        bookingStayRepository.save(stay);

        booking.setStatus(BookingStatus.CHECKED_IN);
        Booking saved = bookingRepository.save(booking);
        publishBookingEvent(saved, "BookingCheckedInEvent");
        return saved;
    }

    @Transactional
    public Booking updateCheckInRepresentative(Long bookingId, CheckInRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Check-in representative can only be changed after check-in");
        }
        BookingStay stay = bookingStayRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new IllegalStateException("Booking stay not found for booking: " + bookingId));
        BookingGuest representative = resolveCheckInRepresentative(booking, request, LocalDate.now());
        applyRepresentativeToStay(stay, representative, request);
        bookingStayRepository.save(stay);
        return withStayTimes(booking);
    }

    @Transactional
    public Booking collectRemainingPayment(Long bookingId, RemainingPaymentRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (request == null || request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("Remaining payment amount must be greater than zero");
        }

        if (request.getUserId() == null) {
            request.setUserId(booking.getUserId());
        }
        paymentServiceClient.collectRemainingPayment(bookingId, request);
        double paid = valueOrZero(booking.getPaidAmount()) + request.getAmount();
        booking.setPaidAmount(paid);
        if (paid + 0.01 >= valueOrZero(booking.getFinalTotal())) {
            booking.setPaymentStatus("PAID");
            booking.setStatus(BookingStatus.CONFIRMED);
        }
        if (request.getTransactionId() != null && !request.getTransactionId().isBlank()) {
            booking.setPaymentTransactionId(request.getTransactionId());
        }
        return bookingRepository.save(booking);
    }

    @Transactional
    public Booking confirmCheckinPayment(Long bookingId, ConfirmCheckinPaymentRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (request == null || request.getPaymentCode() == null || request.getPaymentCode().isBlank()) {
            throw new IllegalArgumentException("paymentCode is required");
        }
        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("amount must be greater than zero");
        }
        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            return withStayTimes(booking);
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.DEPOSIT_PAID) {
            throw new IllegalStateException("Booking cannot be checked in with current status: " + booking.getStatus());
        }

        double paid = valueOrZero(booking.getPaidAmount()) + request.getAmount();
        double total = valueOrZero(booking.getFinalTotal());
        booking.setPaidAmount(paid);
        booking.setPaymentStatus("PAID");
        booking.setPaymentTransactionId(request.getPaymentCode());
        booking.setStatus(BookingStatus.CHECKED_IN);

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElseGet(BookingStay::new);
        stay.setBookingId(bookingId);
        stay.setActualCheckInAt(ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime());
        stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
        bookingStayRepository.save(stay);

        if (paid + 0.01 < total) {
            log.warn("Check-in payment confirmed but booking still appears underpaid. bookingId={}, paid={}, total={}",
                    bookingId, paid, total);
        }

        Booking saved = bookingRepository.save(booking);
        publishBookingEvent(saved, "BookingCheckedInEvent");
        return withStayTimes(saved);
    }

    public Booking checkOut(Long bookingId) {
        CheckOutRequest request = new CheckOutRequest();
        request.setStaffId(0L);
        checkoutService.checkout(bookingId, request);
        return bookingRepository.findById(bookingId).orElseThrow();
    }

    @Transactional
    public CheckoutResponse checkout(Long bookingId, CheckOutRequest request) {
        return checkoutService.checkout(bookingId, request);
    }

    public CheckoutResponse calculateCheckout(Long bookingId) {
        return checkoutService.calculateCheckout(bookingId);
    }

    @Transactional
    public Booking completeCheckout(Long bookingId) {
        return checkoutService.completeCheckout(bookingId);
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
                || booking.getStatus() == BookingStatus.CHECKED_OUT
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

    private Booking withStayTimes(Booking booking) {
        if (booking == null || booking.getId() == null) {
            return booking;
        }
        bookingStayRepository.findByBookingId(booking.getId()).ifPresent(stay -> {
            booking.setActualCheckInAt(stay.getActualCheckInAt());
            booking.setActualCheckOutAt(stay.getActualCheckOutAt());
        });
        return booking;
    }

    private BookingGuest resolveCheckInRepresentative(Booking booking, CheckInRequest request, LocalDate checkInDate) {
        if (request == null || request.getRepresentativeGuestId() == null) {
            throw new IllegalArgumentException("representativeGuestId is required");
        }
        String cccd = clean(request.getRepresentativeCccd());
        if (!cccd.matches("\\d{12}")) {
            throw new IllegalArgumentException("representativeCccd must contain exactly 12 digits");
        }
        BookingGuest representative = bookingGuestService.getGuests(booking.getId()).stream()
                .filter(guest -> request.getRepresentativeGuestId().equals(guest.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Check-in representative must be one of booking guests"));
        if (!representative.isAdultOn(checkInDate)) {
            throw new IllegalArgumentException("Check-in representative must be at least 18 years old");
        }
        String phone = clean(request.getRepresentativePhone());
        if (phone.isBlank()) {
            phone = clean(representative.getPhone());
        }
        if (phone.isBlank()) {
            throw new IllegalArgumentException("representativePhone is required when selected guest has no phone");
        }
        List<BookingGuest> guests = bookingGuestService.getGuests(booking.getId());
        for (BookingGuest guest : guests) {
            boolean selected = guest.getId().equals(representative.getId());
            guest.setCheckInPerson(selected);
            if (selected) {
                guest.setPhone(phone);
                guest.setCccd(cccd);
            }
        }
        representative.setPhone(phone);
        representative.setCccd(cccd);
        representative.setCheckInPerson(true);
        bookingGuestService.saveGuests(booking.getId(), guests.stream()
                .sorted(Comparator.comparing(BookingGuest::getId))
                .toList());
        return representative;
    }

    private void applyRepresentativeToStay(BookingStay stay, BookingGuest representative, CheckInRequest request) {
        String phone = clean(request.getRepresentativePhone());
        if (phone.isBlank()) {
            phone = clean(representative.getPhone());
        }
        stay.setRepresentativeGuestId(representative.getId());
        stay.setRepresentativeFullName(representative.getFullName());
        stay.setRepresentativePhone(phone);
        stay.setRepresentativeCccd(clean(request.getRepresentativeCccd()));
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private PaymentStatusResponse getPaymentStatus(Long bookingId) {
        return paymentServiceClient.getInvoiceStatus(bookingId);
    }

    private RatePlan parseRatePlan(String value) {
        if (value == null || value.isBlank()) {
            return RatePlan.FLEXIBLE;
        }
        return RatePlan.valueOf(value);
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

    private void publishBookingEvent(Booking booking, String status) {
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), status);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.status", event);
    }
}
