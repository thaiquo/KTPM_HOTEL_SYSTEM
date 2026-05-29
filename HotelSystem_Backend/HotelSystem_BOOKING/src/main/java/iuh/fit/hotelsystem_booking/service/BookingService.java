package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.*;
import iuh.fit.hotelsystem_booking.entity.*;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.UUID;
import java.util.List;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private static final Logger log = LoggerFactory.getLogger(BookingService.class);
    private static final int MEMBER_DISCOUNT_ROOM_THRESHOLD = 20;
    private static final int MEMBER_DISCOUNT_PERCENT = 20;
    private static final int ROOM_ENRICHMENT_LIMIT = 8;

    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final RabbitTemplate rabbitTemplate;
    private final BookingValidator bookingValidator;
    private final PricingService pricingService;
    private final CheckInOutService checkInOutService;
    private final BookingGuestService bookingGuestService;
    private final CheckoutService checkoutService;
    private final PaymentServiceClient paymentServiceClient;
    private final RoomServiceClient roomServiceClient;
    private final iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository serviceLineRepository;
    private RefundService refundService;

    @Autowired
    public BookingService(BookingRepository bookingRepository,
                          BookingStayRepository bookingStayRepository,
                          RabbitTemplate rabbitTemplate,
                          BookingValidator bookingValidator,
                          PricingService pricingService,
                          CheckInOutService checkInOutService,
                          BookingGuestService bookingGuestService,
                          CheckoutService checkoutService,
                          PaymentServiceClient paymentServiceClient,
                          RoomServiceClient roomServiceClient,
                          iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository serviceLineRepository) {
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.bookingValidator = bookingValidator;
        this.pricingService = pricingService;
        this.checkInOutService = checkInOutService;
        this.bookingGuestService = bookingGuestService;
        this.checkoutService = checkoutService;
        this.paymentServiceClient = paymentServiceClient;
        this.roomServiceClient = roomServiceClient;
        this.serviceLineRepository = serviceLineRepository;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setRefundService(RefundService refundService) {
        this.refundService = refundService;
    }

    public BookingService(BookingRepository bookingRepository,
                          BookingStayRepository bookingStayRepository,
                          RabbitTemplate rabbitTemplate,
                          BookingValidator bookingValidator,
                          PricingService pricingService,
                          CheckInOutService checkInOutService,
                          BookingGuestService bookingGuestService,
                          CheckoutService checkoutService,
                          PaymentServiceClient paymentServiceClient,
                          RoomServiceClient roomServiceClient) {
        this(bookingRepository, bookingStayRepository, rabbitTemplate, bookingValidator, pricingService,
                checkInOutService, bookingGuestService, checkoutService, paymentServiceClient, roomServiceClient, null);
    }

    /**
     * Internal: Basic validation and shared creation logic for Booking (Header + Items).
     */
    @Transactional
    public Booking createBooking(Booking booking) {
        if (booking.getItems() == null || booking.getItems().isEmpty()) {
            throw new IllegalArgumentException("Booking must contain at least one room");
        }

        bookingValidator.validate(booking);

        if (booking.getBookingCode() == null || booking.getBookingCode().isBlank()) {
            booking.setBookingCode(generateBookingCode());
        }

        // Validate overlap for all rooms
        for (BookingItem item : booking.getItems()) {
            if (bookingRepository.existsActiveOverlapForRoom(
                    item.getRoomId(), booking.getCheckIn(), booking.getCheckOut())) {
                throw new IllegalStateException("Room " + item.getRoomId() + " is not available for the selected dates");
            }
        }

        RatePlan ratePlan = booking.getRatePlan() != null ? booking.getRatePlan() : RatePlan.FLEXIBLE;
        long historicalBookedRooms = resolveBookedRoomsCountForMembership(booking.getUserId());
        int currentBookingRooms = booking.getItems().size();
        boolean memberDiscountEligible = booking.getUserId() != null
            && historicalBookedRooms + currentBookingRooms >= MEMBER_DISCOUNT_ROOM_THRESHOLD;

        if (memberDiscountEligible) {
            log.info("Member discount applied. userId={}, historicalRooms={}, currentRooms={}",
                booking.getUserId(), historicalBookedRooms, currentBookingRooms);
        }
        boolean enrichRoomDetails = booking.getItems().size() <= ROOM_ENRICHMENT_LIMIT;
        if (!enrichRoomDetails) {
            log.info("Skipping room detail enrichment for bulk booking. userId={}, rooms={}",
                booking.getUserId(), booking.getItems().size());
        }

        // Calculate total for all items
        double subtotal = 0;
        double discountTotal = 0;
        double totalPrice = 0;
        int nights = (int) ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());

        for (BookingItem item : booking.getItems()) {
            item.setCheckIn(booking.getCheckIn());
            item.setCheckOut(booking.getCheckOut());
            item.setNights(nights);
            item.setStatus(BookingItemStatus.PENDING_PAYMENT);

            // Fetch room details to apply bonuses (view, bathtub)
            double basePrice = item.getPriceSnapshot();
            if (enrichRoomDetails) {
                try {
                    Room room = roomServiceClient.getRoomById(item.getRoomId());
                    if (room != null) {
                        if (isRoomHardUnavailable(room.getStatus())) {
                            throw new IllegalStateException("Room " + item.getRoomId() + " is not bookable: " + room.getStatus());
                        }
                        if (item.getRoomTypeId() == null && room.getRoomType() != null) {
                            item.setRoomTypeId(room.getRoomType().getId());
                        }
                        if ("River View".equals(room.getViewType()) || "Pool View".equals(room.getViewType())) {
                            basePrice += 150000;
                        } else if ("Garden View".equals(room.getViewType())) {
                            basePrice += 50000;
                        }
                        if (Boolean.TRUE.equals(room.getHasBathtub())) {
                            basePrice += 50000;
                        }
                    }
                } catch (Exception e) {
                    enrichRoomDetails = false;
                    log.warn("Room service unavailable during booking pricing. Disable enrichment for remaining rooms. roomId={}", item.getRoomId());
                }
            }

            // Calculate price with weekend surcharges
                PricingResult itemPrice = pricingService.calculatePrice(
                    booking.getCheckIn(), booking.getCheckOut(), basePrice, ratePlan);

            item.setPriceSnapshot(basePrice); // Store the adjusted base price
                item.setFinalPrice(itemPrice.getFinalTotal());
                item.setDiscount(Math.max(0.0, itemPrice.getBaseTotal() - itemPrice.getFinalTotal()));

                subtotal += itemPrice.getBaseTotal();
                discountTotal += item.getDiscount() != null ? item.getDiscount() : 0.0;
                totalPrice += itemPrice.getFinalTotal();
        }

            PricingResult finalPricing = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(),
                booking.getItems().isEmpty() ? 0.0 : subtotal / booking.getItems().size() / Math.max(1, nights),
                ratePlan);

            double memberDiscountAmount = memberDiscountEligible
                ? roundCurrency(totalPrice * MEMBER_DISCOUNT_PERCENT / 100.0)
                : 0.0;
            double discountedTotalPrice = roundCurrency(totalPrice - memberDiscountAmount);
            int effectiveDiscountPercent = finalPricing.getDiscountPercent()
                + (memberDiscountEligible ? MEMBER_DISCOUNT_PERCENT : 0);

            booking.setSubtotal(subtotal);
            booking.setBaseTotal(subtotal);
            booking.setDiscountTotal(roundCurrency(discountTotal + memberDiscountAmount));
            booking.setTaxAmount(0.0);
            booking.setPriceMultiplier(finalPricing.getPriceMultiplier());
            booking.setFinalTotal(discountedTotalPrice);
            booking.setTotalPrice(discountedTotalPrice);
            booking.setDepositAmount(roundCurrency(discountedTotalPrice * finalPricing.getDepositPercent() / 100.0));
        booking.setIsHolidayBooking(finalPricing.isHolidayBooking());
        booking.setRatePlan(ratePlan);
        booking.setDiscountPercent(effectiveDiscountPercent);
        booking.setRefundable(finalPricing.isRefundable());
        booking.setAllowModification(finalPricing.isAllowModification());
        booking.setNonRefundable(!finalPricing.isRefundable());
            booking.setCurrency("VND");
            booking.setPriceSnapshotVersion(1);
            booking.setTotalRooms(booking.getItems().size());
            booking.setTotalGuests(booking.getGuestCount() != null && booking.getGuestCount() > 0 ? booking.getGuestCount() : booking.getItems().size());

        if (booking.getPaymentType() == null || booking.getPaymentType().isBlank()) {
            booking.setPaymentType(finalPricing.getPaymentType());
        }
        if (ratePlan == RatePlan.NON_REFUNDABLE
                && !BookingConstants.PAYMENT_TYPE_FULL.equals(booking.getPaymentType())) {
            throw new IllegalArgumentException("NON_REFUNDABLE rate plan requires full payment");
        }
        if (booking.getPaymentStatus() == null) {
            booking.setPaymentStatus("PENDING");
        }

        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setLockStatus(BookingLockStatus.ACTIVE);
        booking.setCreatedAt(ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime());
        booking.setHoldExpiresAt(ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).plusMinutes(BookingConstants.HOLD_MINUTES).toLocalDateTime());
        booking.setReservationExpiredAt(booking.getHoldExpiresAt());
        booking.setSource(booking.getSource() != null ? booking.getSource() : BookingSource.WEB);

        Booking saved = bookingRepository.save(booking);

        // RabbitMQ room hold events
        for (BookingItem item : saved.getItems()) {
            RoomMessage msg = new RoomMessage();
            msg.setBookingId(saved.getId());
            msg.setRoomId(item.getRoomId());
            try {
                rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.hold", msg);
            } catch (Exception ex) {
                log.warn("Could not publish room hold event. bookingId={}, roomId={}", saved.getId(), item.getRoomId());
            }
        }

        return saved;
    }

    /**
     * Map DTO to Entity and handle multi-room Cart logic.
     */
    @Transactional
    public Booking createBooking(BookingCreateRequest request) {
        Booking booking = new Booking();
        booking.setUserId(request.getUserId());
        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        booking.setPaymentType(request.getPaymentType());
        booking.setRatePlan(parseRatePlan(request.getRatePlan()));
        booking.setSource(parseSource(request.getSource()));
        booking.setNotes(request.getNotes());
        booking.setCreatedBy(request.getUserId() != null ? String.valueOf(request.getUserId()) : null);
        booking.setGuestCount(request.getGuestCount());

        // Add items from cart
        for (BookingCreateRequest.RoomBookingRequest rr : request.getRooms()) {
            BookingItem item = new BookingItem();
            item.setRoomId(rr.getRoomId());
            item.setRoomTypeId(rr.getRoomTypeId());
            item.setPriceSnapshot(rr.getPriceSnapshot());
            booking.addItem(item);
        }

        Booking saved = createBooking(booking);
        List<BookingGuest> savedGuests = new ArrayList<>();
        boolean hasRoomScopedGuests = request.getRooms() != null
                && request.getRooms().stream().anyMatch(room -> room.getGuests() != null && !room.getGuests().isEmpty());
        if (hasRoomScopedGuests) {
            Map<Long, BookingCreateRequest.RoomBookingRequest> roomsByRoomId = request.getRooms().stream()
                    .collect(Collectors.toMap(BookingCreateRequest.RoomBookingRequest::getRoomId, room -> room, (left, right) -> left));
            for (BookingItem item : saved.getItems()) {
                BookingCreateRequest.RoomBookingRequest roomRequest = roomsByRoomId.get(item.getRoomId());
                List<BookingGuest> roomGuests = bookingGuestService.validateAndBuildRoomGuests(
                        roomRequest != null ? roomRequest.getGuests() : List.of(),
                        item.getRoomId(),
                        item.getCheckIn(),
                        request.getRoomCapacitySnapshot());
                savedGuests.addAll(bookingGuestService.saveRoomGuests(saved.getId(), item.getId(), roomGuests));
            }
        } else {
            List<BookingGuest> guests = bookingGuestService.validateAndBuildGuests(
                    request.getPrimaryGuest(),
                    request.getGuests(),
                    request.getCheckIn(),
                    request.getGuestCount(),
                    request.getRoomCapacitySnapshot());
            savedGuests = bookingGuestService.saveGuests(saved.getId(), guests);
        }
        savedGuests.stream()
                .filter(guest -> Boolean.TRUE.equals(guest.getPrimaryGuest()))
                .findFirst()
                .ifPresent(guest -> saved.setPrimaryGuestId(guest.getId()));
        saved.setPreCheckinCompleted(false);
        saved.setGuestCount(savedGuests.size());
        saved.setTotalGuests(savedGuests.size());
        return attachGuestsToItems(bookingRepository.save(saved));
    }

    public Booking getBooking(Long id) {
        return attachGuestsToItems(normalizePaidBooking(findBookingWithItems(id)));
    }

    public List<Booking> getBookingsByUserId(Long userId) {
        return bookingRepository.findByUserIdWithItems(userId).stream()
                .map(this::reconcilePaymentStatusIfNeeded)
                .map(this::normalizePaidBooking)
                .map(this::attachGuestsToItems)
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
        // Simplified modification logic for multi-room bookings
        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());

        // Re-calculate aggregate total
        double aggregateBaseTotal = 0;
        int nights = (int) ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
        for (BookingItem item : booking.getItems()) {
            item.setCheckIn(booking.getCheckIn());
            item.setCheckOut(booking.getCheckOut());
            item.setNights(nights);
            PricingResult itemPrice = pricingService.calculatePrice(
                    booking.getCheckIn(), booking.getCheckOut(), item.getPriceSnapshot(), booking.getRatePlan());
            aggregateBaseTotal += itemPrice.getBaseTotal();
        }

        PricingResult finalPricing = pricingService.calculatePrice(
                booking.getCheckIn(), booking.getCheckOut(), aggregateBaseTotal / nights, booking.getRatePlan());

        long historicalBookedRooms = resolveBookedRoomsCountForMembership(booking.getUserId());
        int currentBookingRooms = booking.getItems() != null ? booking.getItems().size() : 0;
        boolean memberDiscountEligible = booking.getUserId() != null
            && historicalBookedRooms + currentBookingRooms >= MEMBER_DISCOUNT_ROOM_THRESHOLD;
        double memberDiscountAmount = memberDiscountEligible
            ? roundCurrency(finalPricing.getFinalTotal() * MEMBER_DISCOUNT_PERCENT / 100.0)
            : 0.0;
        double discountedTotal = roundCurrency(finalPricing.getFinalTotal() - memberDiscountAmount);
        double pricingDiscountAmount = Math.max(0.0, aggregateBaseTotal - finalPricing.getFinalTotal());

        booking.setBaseTotal(aggregateBaseTotal);
        booking.setPriceMultiplier(finalPricing.getPriceMultiplier());
        booking.setFinalTotal(discountedTotal);
        booking.setTotalPrice(discountedTotal);
        booking.setDiscountTotal(roundCurrency(pricingDiscountAmount + memberDiscountAmount));
        booking.setDepositAmount(roundCurrency(discountedTotal * finalPricing.getDepositPercent() / 100.0));
        booking.setDiscountPercent(finalPricing.getDiscountPercent()
            + (memberDiscountEligible ? MEMBER_DISCOUNT_PERCENT : 0));
        return bookingRepository.save(booking);
    }

    public List<Long> getBookedRoomIds(LocalDate checkIn, LocalDate checkOut) {
        return bookingRepository.findBookedRoomIds(checkIn, checkOut);
    }

    public List<Booking> getStaffCheckInList() {
        return bookingRepository.findByStatusInOrderByCheckInAsc(
                List.of(BookingStatus.PENDING_PAYMENT, BookingStatus.DEPOSIT_PAID, BookingStatus.CONFIRMED, BookingStatus.BOOKED, BookingStatus.PENDING, BookingStatus.CREATED))
                .stream()
                .map(this::reconcilePaymentStatusIfNeeded)
                .toList();
    }

    public List<Booking> getStaffCheckoutList() {
        return bookingRepository.findByStatusInOrderByCheckInAsc(
                List.of(BookingStatus.CHECKED_IN, BookingStatus.PARTIALLY_CHECKED_IN, BookingStatus.PARTIALLY_CHECKED_OUT, BookingStatus.CHECKOUT_PENDING_PAYMENT)
        ).stream()
                .map(this::withStayTimes)
                .toList();
    }

    @Transactional
    public Booking checkIn(Long bookingId, CheckInRequest request) {
        Booking booking = findBookingWithItems(bookingId);
        if (booking.getStatus() == BookingStatus.CHECKED_IN) {
            return updateCheckInRepresentative(bookingId, request);
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED
                && booking.getStatus() != BookingStatus.DEPOSIT_PAID
                && booking.getStatus() != BookingStatus.BOOKED) {
            throw new IllegalStateException("Booking can only be checked in when status is CONFIRMED, DEPOSIT_PAID or BOOKED");
        }

        LocalDateTime now = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime();
        if (booking.getCheckIn() != null && now.toLocalDate().isBefore(booking.getCheckIn())) {
            throw new IllegalStateException("Booking cannot be checked in before check-in date");
        }

        if (booking.getCheckOut() != null) {
            LocalDateTime checkInDeadline = booking.getCheckOut().atTime(BookingConstants.CHECK_OUT_HOUR, 0);
            if (now.isAfter(checkInDeadline)) {
                throw new IllegalStateException("Booking can no longer be checked in after 12:00 on the check-out date");
            }
        }
        if (request == null || request.getStaffId() == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        BookingGuest representative = resolveCheckInRepresentative(booking, request, now.toLocalDate());

        // Check-in only confirms identity and room handover. Remaining room balance is collected at checkout.

        // Reserved rooms belong to this booking; they are valid to move into OCCUPIED at check-in.
        for (BookingItem item : booking.getItems()) {
            try {
                iuh.fit.hotelsystem_booking.dto.Room room = roomServiceClient.getRoomById(item.getRoomId());
                String rstatus = room != null ? room.getStatus() : null;
                if (!isRoomCheckInReady(rstatus)) {
                    if (isStaleTransientStatusOwnedByThisBooking(booking, item, rstatus)) {
                        log.warn("Room {} is {} in room-service but has no other checked-in overlap. Treating it as stale before check-in for booking {}.",
                                item.getRoomId(), rstatus, booking.getId());
                        setRoomStatus(item.getRoomId(), "RESERVED");
                        continue;
                    }
                    throw new IllegalStateException("Room " + item.getRoomId() + " is not ready for check-in: " + rstatus);
                }
            } catch (IllegalStateException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalStateException("Could not validate room " + item.getRoomId() + ": " + ex.getMessage());
            }
        }

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElseGet(BookingStay::new);
        stay.setBookingId(bookingId);
        applyRepresentativeToStay(stay, representative, request);
        stay.setActualCheckInAt(now);
        stay.setCheckedInByStaffId(request.getStaffId());
        stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
        bookingStayRepository.save(stay);

        BigDecimal earlyCheckInFee = resolveEarlyCheckInFee(booking, now);
        persistEarlyCheckInSurcharge(bookingId, stay, request.getStaffId(), earlyCheckInFee);

        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setActualCheckInAt(now);
        Booking saved = bookingRepository.save(booking);

        // Update all rooms to OCCUPIED
        for (BookingItem item : saved.getItems()) {
            setRoomStatus(item.getRoomId(), "OCCUPIED");
        }

        publishBookingEvent(saved, "BookingCheckedInEvent");
        return saved;
    }

    @Transactional
    public Booking updateCheckInRepresentative(Long bookingId, CheckInRequest request) {
        Booking booking = findBookingWithItems(bookingId);
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
        Booking booking = findBookingWithItems(bookingId);
        if (request == null || request.getAmount() == null || request.getAmount() <= 0) {
            throw new IllegalArgumentException("Remaining payment amount must be greater than zero");
        }
        if (request.getTransactionId() != null
                && !request.getTransactionId().isBlank()
                && request.getTransactionId().equals(booking.getPaymentTransactionId())) {
            return booking;
        }
        if ("PAID".equalsIgnoreCase(booking.getPaymentStatus())
                && valueOrZero(booking.getPaidAmount()) + 0.01 >= valueOrZero(booking.getFinalTotal())) {
            return booking;
        }

        if (request.getUserId() == null) {
            request.setUserId(booking.getUserId());
        }
        paymentServiceClient.collectRemainingPayment(bookingId, remainingPaymentIdempotencyKey(bookingId, request), request);
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

    private String remainingPaymentIdempotencyKey(Long bookingId, RemainingPaymentRequest request) {
        String transaction = request.getTransactionId();
        if (transaction != null && !transaction.isBlank()) {
            return "booking:" + bookingId + ":remaining:" + transaction.trim();
        }
        long amount = Math.round(valueOrZero(request.getAmount()));
        String method = request.getMethod() != null && !request.getMethod().isBlank()
                ? request.getMethod().trim().toUpperCase()
                : "CASH";
        return "booking:" + bookingId + ":remaining:" + amount + ":" + method;
    }

    @Transactional
    public Booking confirmCheckinPayment(Long bookingId, ConfirmCheckinPaymentRequest request) {
        Booking booking = findBookingWithItems(bookingId);
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
        booking.setPaidAmount(paid);
        booking.setPaymentStatus("PAID");
        booking.setPaymentTransactionId(request.getPaymentCode());
        booking.setStatus(BookingStatus.CHECKED_IN);
        booking.setActualCheckInAt(ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime());

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElseGet(BookingStay::new);
        stay.setBookingId(bookingId);
        stay.setActualCheckInAt(booking.getActualCheckInAt());
        BookingGuest representative = resolveRepresentativeForAutoCheckin(bookingId, booking.getCheckIn());
        if (representative != null) {
            stay.setRepresentativeGuestId(representative.getId());
            stay.setRepresentativeFullName(representative.getFullName());
            stay.setRepresentativePhone(clean(representative.getPhone()));
            stay.setRepresentativeCccd(clean(representative.getCccd()));
        }
        stay.setLateCheckoutPaymentStatus(LateCheckoutPaymentStatus.NONE);
        bookingStayRepository.save(stay);

        Booking saved = bookingRepository.save(booking);
        for (BookingItem item : saved.getItems()) {
            setRoomStatus(item.getRoomId(), "OCCUPIED");
        }
        publishBookingEvent(saved, "BookingCheckedInEvent");
        return withStayTimes(saved);
    }

    public CheckoutResponse calculateCheckout(Long bookingId) {
        return checkoutService.calculateCheckout(bookingId);
    }

    public java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> listServiceLines(Long bookingId) {
        java.util.List<iuh.fit.hotelsystem_booking.entity.BookingServiceLine> lines = serviceLineRepository.findByBookingId(bookingId);
        java.util.List<iuh.fit.hotelsystem_booking.dto.ServiceLineDto> dtos = new java.util.ArrayList<>();
        for (iuh.fit.hotelsystem_booking.entity.BookingServiceLine l : lines) {
            iuh.fit.hotelsystem_booking.dto.ServiceLineDto dto = new iuh.fit.hotelsystem_booking.dto.ServiceLineDto();
            dto.setId(l.getId());
            dto.setBookingId(l.getBookingId());
            dto.setName(l.getName());
            dto.setQuantity(l.getQuantity());
            dto.setUnitPrice(l.getUnitPrice());
            dto.setLineTotal(l.getLineTotal());
            dtos.add(dto);
        }
        return dtos;
    }

    @Transactional
    public iuh.fit.hotelsystem_booking.dto.ServiceLineDto addServiceLine(Long bookingId, iuh.fit.hotelsystem_booking.dto.ServiceLineDto request, Long staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.CHECKED_IN && booking.getStatus() != BookingStatus.CHECKOUT_PENDING_PAYMENT) {
            throw new IllegalStateException("Can only add service lines while guest is checked in");
        }

        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElse(null);

        iuh.fit.hotelsystem_booking.entity.BookingServiceLine line = new iuh.fit.hotelsystem_booking.entity.BookingServiceLine();
        line.setBookingId(bookingId);
        line.setStayId(stay != null ? stay.getId() : null);
        line.setName(request.getName());
        line.setQuantity(request.getQuantity() != null ? request.getQuantity() : 1);
        line.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : java.math.BigDecimal.ZERO);
        line.setLineTotal(line.getUnitPrice().multiply(java.math.BigDecimal.valueOf(line.getQuantity())));
        line.setAddedByStaffId(staffId);
        line.setCreatedAt(java.time.LocalDateTime.now());

        iuh.fit.hotelsystem_booking.entity.BookingServiceLine saved = serviceLineRepository.save(line);
        iuh.fit.hotelsystem_booking.dto.ServiceLineDto out = new iuh.fit.hotelsystem_booking.dto.ServiceLineDto();
        out.setId(saved.getId());
        out.setBookingId(saved.getBookingId());
        out.setName(saved.getName());
        out.setQuantity(saved.getQuantity());
        out.setUnitPrice(saved.getUnitPrice());
        out.setLineTotal(saved.getLineTotal());
        return out;
    }

    @Transactional
    public void removeServiceLine(Long bookingId, Long lineId, Long staffId) {
        iuh.fit.hotelsystem_booking.entity.BookingServiceLine line = serviceLineRepository.findById(lineId)
                .orElseThrow(() -> new IllegalArgumentException("Service line not found: " + lineId));
        if (!bookingId.equals(line.getBookingId())) {
            throw new IllegalArgumentException("Service line does not belong to booking: " + bookingId);
        }
        serviceLineRepository.delete(line);
    }

    @Transactional
    public Booking completeCheckout(Long bookingId) {
        return checkoutService.completeCheckout(bookingId);
    }

    public CheckoutResponse checkout(Long bookingId, CheckOutRequest request) {
        return checkoutService.checkout(bookingId, request);
    }

    public Booking checkOut(Long bookingId) {
        return checkoutService.completeCheckout(bookingId);
    }

    @Transactional
    public RoomChangeResponse changeRoom(Long bookingId, RoomChangeRequest request, Long staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
        if (booking.getStatus() != BookingStatus.CHECKED_IN) {
            throw new IllegalStateException("Room can only be changed while booking is CHECKED_IN");
        }
        if (request == null || request.getToRoomId() == null) {
            throw new IllegalArgumentException("toRoomId is required");
        }

        BookingItem currentItem = resolveRoomChangeItem(booking, request.getFromRoomId());
        Long oldRoomId = currentItem.getRoomId();
        if (oldRoomId != null && oldRoomId.equals(request.getToRoomId())) {
            throw new IllegalArgumentException("New room must be different from current room");
        }

        Room newRoom = roomServiceClient.getRoomById(request.getToRoomId());
        if (newRoom == null) {
            throw new IllegalArgumentException("New room not found: " + request.getToRoomId());
        }
        if (!"AVAILABLE".equalsIgnoreCase(newRoom.getStatus())) {
            throw new IllegalStateException("New room must be AVAILABLE");
        }

        String oldRoomNextStatus = normalizeOldRoomNextStatus(request.getOldRoomNextStatus());
        int remainingNights = calculateRemainingNights(booking);
        BigDecimal oldNightly = BigDecimal.valueOf(currentItem.getPriceSnapshot() != null ? currentItem.getPriceSnapshot() : 0.0);
        BigDecimal newNightly = resolveRoomNightlyPrice(newRoom);
        BigDecimal perNightDiff = newNightly.subtract(oldNightly);
        BigDecimal totalDiff = perNightDiff.multiply(BigDecimal.valueOf(remainingNights));

        currentItem.setRoomId(request.getToRoomId());
        if (newRoom.getRoomType() != null) {
            currentItem.setRoomTypeId(newRoom.getRoomType().getId());
        }
        currentItem.setPriceSnapshot(newNightly.doubleValue());

        Booking saved = bookingRepository.save(booking);
        setRoomStatus(oldRoomId, oldRoomNextStatus);
        setRoomStatus(request.getToRoomId(), "OCCUPIED");
        persistRoomChangeAdjustment(bookingId, oldRoomId, request.getToRoomId(), totalDiff, staffId);
        if (totalDiff.compareTo(BigDecimal.ZERO) < 0 && refundService != null) {
            refundService.createRoomChangeRefundTransaction(saved, totalDiff.abs(),
                    "ROOM_CHANGE_REFUND");
        }

        RoomChangeResponse response = new RoomChangeResponse();
        response.setBookingId(bookingId);
        response.setFromRoomId(oldRoomId);
        response.setToRoomId(request.getToRoomId());
        response.setRemainingNights(remainingNights);
        response.setOldNightlyPrice(oldNightly);
        response.setNewNightlyPrice(newNightly);
        response.setPriceDifferencePerNight(perNightDiff);
        response.setTotalDifference(totalDiff);
        response.setOldRoomNextStatus(oldRoomNextStatus);
        response.setPaymentAction(totalDiff.compareTo(BigDecimal.ZERO) > 0 ? "COLLECT" : totalDiff.compareTo(BigDecimal.ZERO) < 0 ? "REFUND" : "NONE");
        response.setBooking(saved);
        return response;
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

    private Booking reconcilePaymentStatusIfNeeded(Booking booking) {
        if (booking == null || booking.getId() == null || booking.getStatus() == null) {
            return booking;
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT
                && booking.getStatus() != BookingStatus.PENDING
                && booking.getStatus() != BookingStatus.DEPOSIT_PAID
                && booking.getStatus() != BookingStatus.CONFIRMED) {
            return booking;
        }

        try {
            PaymentStatusResponse paymentStatus = getPaymentStatus(booking.getId());
            if (paymentStatus == null || paymentStatus.getStatus() == null) {
                return booking;
            }

            String status = paymentStatus.getStatus().trim().toUpperCase();
            boolean paid = "PAID".equals(status);
            boolean partial = "PARTIAL".equals(status);

            if (!paid && !partial) {
                return booking;
            }

            BookingStatus targetStatus = booking.getStatus();
            String paymentType = booking.getPaymentType() != null ? booking.getPaymentType().trim().toUpperCase() : "";

            if (paid) {
                if ("DEPOSIT".equals(paymentType)) {
                    targetStatus = BookingStatus.DEPOSIT_PAID;
                    booking.setPaidAmount(valueOrZero(booking.getDepositAmount()));
                    booking.setPaymentStatus("DEPOSITED");
                } else {
                    targetStatus = BookingStatus.CONFIRMED;
                    booking.setPaidAmount(valueOrZero(booking.getFinalTotal()));
                    booking.setPaymentStatus("PAID");
                }
            } else if (partial && booking.getStatus() == BookingStatus.PENDING_PAYMENT) {
                if (valueOrZero(booking.getDepositAmount()) > 0.0 && valueOrZero(paymentStatus.getPaidAmount()) >= valueOrZero(booking.getDepositAmount())) {
                    targetStatus = BookingStatus.DEPOSIT_PAID;
                    booking.setPaidAmount(valueOrZero(paymentStatus.getPaidAmount()));
                    booking.setPaymentStatus("DEPOSITED");
                }
            }

            if (targetStatus != booking.getStatus()) {
                booking.setStatus(targetStatus);
                if (targetStatus == BookingStatus.CONFIRMED || targetStatus == BookingStatus.DEPOSIT_PAID) {
                    markPendingRoomsBooked(booking);
                    applyAggregatedBookingStatus(booking);
                }
                bookingRepository.save(booking);
            }
        } catch (Exception ex) {
            log.debug("Payment status reconciliation skipped for booking {}: {}", booking.getId(), ex.getMessage());
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
        if (cccd.isBlank()) {
            throw new IllegalArgumentException("representativeCccd (CCCD or Passport) is required");
        }
        boolean isCccd = cccd.matches("\\d{12}");
        boolean isPassport = cccd.matches("[A-Za-z0-9\\-]{5,20}");
        if (!isCccd && !isPassport) {
            throw new IllegalArgumentException("representativeCccd must be a 12-digit CCCD or a valid passport identifier");
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

    private BookingGuest resolveRepresentativeForAutoCheckin(Long bookingId, LocalDate checkInDate) {
        List<BookingGuest> guests = bookingGuestService.getGuests(bookingId);
        BookingGuest primary = null;
        BookingGuest firstAdult = null;
        BookingGuest firstGuest = null;
        LocalDate effectiveDate = checkInDate != null ? checkInDate : LocalDate.now();

        for (BookingGuest guest : guests) {
            if (guest == null) continue;
            if (firstGuest == null) {
                firstGuest = guest;
            }
            if (firstAdult == null && guest.isAdultOn(effectiveDate)) {
                firstAdult = guest;
            }
            if (Boolean.TRUE.equals(guest.getCheckInPerson())) {
                return guest;
            }
            if (primary == null && Boolean.TRUE.equals(guest.getPrimaryGuest())) {
                primary = guest;
            }
        }

        if (primary != null) return primary;
        if (firstAdult != null) return firstAdult;
        return firstGuest;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBookingPaidForCheckIn(Booking booking, PaymentStatusResponse paymentStatus) {
        if (booking == null || booking.getStatus() == null) {
            return false;
        }

        double localPaidAmount = valueOrZero(booking.getPaidAmount());
        double finalTotal = valueOrZero(booking.getFinalTotal());
        boolean paidInPaymentService = paymentStatus != null && "PAID".equalsIgnoreCase(paymentStatus.getStatus());
        boolean paidInBookingService = localPaidAmount > 0 && Math.max(0.0, finalTotal - localPaidAmount) <= 0.01;
        return paidInPaymentService || paidInBookingService;
    }

    private PaymentStatusResponse getPaymentStatus(Long bookingId) {
        return paymentServiceClient.getInvoiceStatus(bookingId);
    }

    private boolean isRoomCheckInReady(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        String normalized = status.trim().toUpperCase();
        return normalized.equals("AVAILABLE") || normalized.equals("RESERVED");
    }

    private boolean isStaleTransientStatusOwnedByThisBooking(Booking booking, BookingItem item, String status) {
        if (booking == null || item == null || status == null) {
            return false;
        }
        String normalized = status.trim().toUpperCase();
        if (!normalized.equals("OCCUPIED") && !normalized.equals("CLEANING")) {
            return false;
        }
        if (booking.getCheckIn() == null || booking.getCheckOut() == null) {
            return false;
        }
        return !bookingRepository.existsOtherCheckedInOverlapForRoom(
                booking.getId(), item.getRoomId(), booking.getCheckIn(), booking.getCheckOut());
    }

    private boolean isRoomHardUnavailable(String status) {
        if (status == null || status.isBlank()) {
            return false;
        }
        String normalized = status.trim().toUpperCase();
        return normalized.equals("MAINTENANCE")
                || normalized.equals("OUT_OF_SERVICE")
                || normalized.equals("BLOCKED");
    }

    private RatePlan parseRatePlan(String value) {
        if (value == null || value.isBlank()) {
            return RatePlan.FLEXIBLE;
        }
        return RatePlan.valueOf(value);
    }

    private BookingSource parseSource(String value) {
        if (value == null || value.isBlank()) {
            return BookingSource.WEB;
        }
        return BookingSource.valueOf(value.toUpperCase());
    }

    private String generateBookingCode() {
        int year = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).getYear();
        String suffix = String.format("%06d", Math.abs(UUID.randomUUID().hashCode()) % 1_000_000);
        return "BK-" + year + "-" + suffix;
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

    private long resolveBookedRoomsCountForMembership(Long userId) {
        if (userId == null) {
            return 0L;
        }

        List<BookingStatus> eligibleStatuses = new ArrayList<>(EnumSet.of(
                BookingStatus.DEPOSIT_PAID,
                BookingStatus.CONFIRMED,
                BookingStatus.CHECKED_IN,
                BookingStatus.CHECKOUT_PENDING_PAYMENT,
                BookingStatus.CHECKED_OUT,
                BookingStatus.COMPLETED
        ));
        return bookingRepository.countBookedRoomsByUserAndStatuses(userId, eligibleStatuses);
    }

    private double roundCurrency(double amount) {
        return Math.round(amount);
    }

    private void publishBookingEvent(Booking booking, String status) {
        BookingEvent event = new BookingEvent(booking.getId(), booking.getUserId(), status);
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "booking.status", event);
    }

    private void setRoomStatus(Long roomId, String status) {
        if (roomId == null) {
            return;
        }
        RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
        dto.setRoomId(roomId);
        dto.setStatus(status);
        try {
            roomServiceClient.updateRoomStatus(roomId, dto);
        } catch (Exception ex) {
            log.debug("Direct room status update skipped. roomId={}, status={}, reason={}", roomId, status, ex.getMessage());
        }
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.status", dto);
    }

    private Booking findBookingWithItems(Long bookingId) {
        return bookingRepository.findByIdWithItems(bookingId)
                .or(() -> bookingRepository.findById(bookingId))
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));
    }

    private BookingItem resolveRoomChangeItem(Booking booking, Long fromRoomId) {
        List<BookingItem> activeItems = booking.getItems() == null
                ? java.util.Collections.emptyList()
                : booking.getItems().stream()
                    .filter(item -> item.getStatus() == null
                            || item.getStatus() == BookingItemStatus.ACTIVE
                            || item.getStatus() == BookingItemStatus.BOOKED
                            || item.getStatus() == BookingItemStatus.CHECKED_IN)
                    .toList();
        if (activeItems.isEmpty()) {
            throw new IllegalStateException("Booking has no active room item");
        }
        if (fromRoomId != null) {
            return activeItems.stream()
                    .filter(item -> fromRoomId.equals(item.getRoomId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("fromRoomId does not belong to booking"));
        }
        if (activeItems.size() > 1) {
            throw new IllegalArgumentException("fromRoomId is required for multi-room booking");
        }
        return activeItems.get(0);
    }

    private String normalizeOldRoomNextStatus(String value) {
        if (value == null || value.isBlank()) {
            return "CLEANING";
        }
        String normalized = value.trim().toUpperCase();
        if (!normalized.equals("CLEANING") && !normalized.equals("AVAILABLE")) {
            throw new IllegalArgumentException("oldRoomNextStatus must be CLEANING or AVAILABLE");
        }
        return normalized;
    }

    private int calculateRemainingNights(Booking booking) {
        if (booking.getCheckOut() == null) {
            return 0;
        }
        LocalDate today = ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDate();
        LocalDate start = booking.getCheckIn() != null && today.isBefore(booking.getCheckIn())
                ? booking.getCheckIn()
                : today;
        return (int) Math.max(0, ChronoUnit.DAYS.between(start, booking.getCheckOut()));
    }

    private BigDecimal resolveRoomNightlyPrice(Room room) {
        if (room != null && room.getRoomType() != null && room.getRoomType().getBasePrice() != null) {
            return BigDecimal.valueOf(room.getRoomType().getBasePrice());
        }
        return BigDecimal.ZERO;
    }

    private void persistRoomChangeAdjustment(Long bookingId, Long oldRoomId, Long newRoomId, BigDecimal totalDiff, Long staffId) {
        if (serviceLineRepository == null || totalDiff == null || totalDiff.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BookingStay stay = bookingStayRepository.findByBookingId(bookingId).orElse(null);
        iuh.fit.hotelsystem_booking.entity.BookingServiceLine line = new iuh.fit.hotelsystem_booking.entity.BookingServiceLine();
        line.setBookingId(bookingId);
        line.setStayId(stay != null ? stay.getId() : null);
        line.setName("Chênh lệch đổi phòng " + oldRoomId + " -> " + newRoomId);
        line.setQuantity(1);
        line.setUnitPrice(totalDiff);
        line.setLineTotal(totalDiff);
        line.setAddedByStaffId(staffId);
        line.setCreatedAt(LocalDateTime.now());
        serviceLineRepository.save(line);
    }

    private BigDecimal resolveEarlyCheckInFee(Booking booking, LocalDateTime checkInAt) {
        if (booking == null || booking.getCheckIn() == null || checkInAt == null) {
            return BigDecimal.ZERO;
        }
        if (!checkInAt.toLocalDate().isEqual(booking.getCheckIn())) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(checkInOutService.calculateEarlyCheckInFee(booking, checkInAt));
    }

    private Booking attachGuestsToItems(Booking booking) {
        if (booking == null || booking.getItems() == null || booking.getItems().isEmpty()) {
            return booking;
        }
        List<BookingGuest> guests = bookingGuestService.getGuests(booking.getId());
        Map<Long, List<BookingGuest>> guestsByRoomItem = guests.stream()
                .filter(guest -> guest.getBookingRoomId() != null)
                .collect(Collectors.groupingBy(BookingGuest::getBookingRoomId));
        Map<Long, List<BookingGuest>> legacyGuestsByRoomId = guests.stream()
                .filter(guest -> guest.getBookingRoomId() == null && guest.getRoomId() != null)
                .collect(Collectors.groupingBy(BookingGuest::getRoomId));
        for (BookingItem item : booking.getItems()) {
            List<BookingGuest> itemGuests = guestsByRoomItem.get(item.getId());
            if ((itemGuests == null || itemGuests.isEmpty()) && item.getRoomId() != null) {
                itemGuests = legacyGuestsByRoomId.get(item.getRoomId());
            }
            item.setGuests(itemGuests != null ? itemGuests : List.of());
        }
        return booking;
    }

    private void markPendingRoomsBooked(Booking booking) {
        if (booking.getItems() == null) {
            return;
        }
        for (BookingItem item : booking.getItems()) {
            if (item.getStatus() == null
                    || item.getStatus() == BookingItemStatus.PENDING_PAYMENT
                    || item.getStatus() == BookingItemStatus.ACTIVE) {
                item.setStatus(BookingItemStatus.BOOKED);
            }
        }
    }

    private void applyAggregatedBookingStatus(Booking booking) {
        if (booking.getItems() == null || booking.getItems().isEmpty()) {
            return;
        }
        long activeRooms = booking.getItems().stream()
                .filter(item -> item.getStatus() != BookingItemStatus.CANCELLED)
                .count();
        long booked = booking.getItems().stream().filter(item -> item.getStatus() == BookingItemStatus.BOOKED).count();
        long checkedIn = booking.getItems().stream().filter(item -> item.getStatus() == BookingItemStatus.CHECKED_IN).count();
        long checkedOut = booking.getItems().stream().filter(item -> item.getStatus() == BookingItemStatus.CHECKED_OUT).count();
        long cancelled = booking.getItems().stream().filter(item -> item.getStatus() == BookingItemStatus.CANCELLED).count();
        if (cancelled == booking.getItems().size()) {
            booking.setStatus(BookingStatus.CANCELLED);
        } else if (activeRooms > 0 && checkedOut == activeRooms) {
            booking.setStatus(BookingStatus.COMPLETED);
        } else if (checkedOut > 0) {
            booking.setStatus(BookingStatus.PARTIALLY_CHECKED_OUT);
        } else if (activeRooms > 0 && checkedIn == activeRooms) {
            booking.setStatus(BookingStatus.CHECKED_IN);
        } else if (checkedIn > 0) {
            booking.setStatus(BookingStatus.PARTIALLY_CHECKED_IN);
        } else if (activeRooms > 0 && booked == activeRooms) {
            booking.setStatus(BookingStatus.BOOKED);
        }
    }

    private void persistEarlyCheckInSurcharge(Long bookingId, BookingStay stay, Long staffId, BigDecimal amount) {
        if (serviceLineRepository == null || amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        BookingServiceLine line = new BookingServiceLine();
        line.setBookingId(bookingId);
        line.setStayId(stay != null ? stay.getId() : null);
        line.setName("Phụ thu check-in sớm");
        line.setQuantity(1);
        line.setUnitPrice(amount);
        line.setLineTotal(amount);
        line.setAddedByStaffId(staffId);
        line.setCreatedAt(LocalDateTime.now());
        serviceLineRepository.save(line);
    }
}
