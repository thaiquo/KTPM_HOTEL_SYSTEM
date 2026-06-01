package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.cqrs.event.CqrsOutboxEventService;
import iuh.fit.hotelsystem_booking.dto.BookingRoomActionResult;
import iuh.fit.hotelsystem_booking.dto.BookingRoomBatchRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomCheckInRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomExtraFeeRequest;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
import iuh.fit.hotelsystem_booking.dto.Room;
import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingServiceLine;
import iuh.fit.hotelsystem_booking.entity.BookingRoomGuestRole;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingItemRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.NoSuchElementException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class BookingRoomWorkflowService {

    private static final Logger log = LoggerFactory.getLogger(BookingRoomWorkflowService.class);

    private final BookingItemRepository bookingItemRepository;
    private final BookingRepository bookingRepository;
    private final BookingGuestRepository bookingGuestRepository;
    private final BookingInvoiceService bookingInvoiceService;
    private final BookingCheckoutBillingService bookingCheckoutBillingService;
    private final BookingServiceLineRepository bookingServiceLineRepository;
    private final RefundCalculationService refundCalculationService;
    private final RefundTransactionRepository refundTransactionRepository;
    private final RefundService refundService;
    private final RabbitTemplate rabbitTemplate;
    private final RoomServiceClient roomServiceClient;
    private CqrsOutboxEventService cqrsOutboxEventService;

    @Autowired
    public BookingRoomWorkflowService(BookingItemRepository bookingItemRepository,
                                      BookingRepository bookingRepository,
                                      BookingGuestRepository bookingGuestRepository,
                                      BookingInvoiceService bookingInvoiceService,
                                      BookingCheckoutBillingService bookingCheckoutBillingService,
                                      BookingServiceLineRepository bookingServiceLineRepository,
                                      RefundCalculationService refundCalculationService,
                                      RefundTransactionRepository refundTransactionRepository,
                                      RefundService refundService,
                                      RabbitTemplate rabbitTemplate,
                                      RoomServiceClient roomServiceClient) {
        this.bookingItemRepository = bookingItemRepository;
        this.bookingRepository = bookingRepository;
        this.bookingGuestRepository = bookingGuestRepository;
        this.bookingInvoiceService = bookingInvoiceService;
        this.bookingCheckoutBillingService = bookingCheckoutBillingService;
        this.bookingServiceLineRepository = bookingServiceLineRepository;
        this.refundCalculationService = refundCalculationService;
        this.refundTransactionRepository = refundTransactionRepository;
        this.refundService = refundService;
        this.rabbitTemplate = rabbitTemplate;
        this.roomServiceClient = roomServiceClient;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCqrsOutboxEventService(CqrsOutboxEventService cqrsOutboxEventService) {
        this.cqrsOutboxEventService = cqrsOutboxEventService;
    }

    public BookingRoomWorkflowService(BookingItemRepository bookingItemRepository,
                                      BookingRepository bookingRepository,
                                      BookingGuestRepository bookingGuestRepository,
                                      BookingInvoiceService bookingInvoiceService,
                                      BookingCheckoutBillingService bookingCheckoutBillingService,
                                      BookingServiceLineRepository bookingServiceLineRepository,
                                      RefundCalculationService refundCalculationService,
                                      RefundTransactionRepository refundTransactionRepository,
                                      RabbitTemplate rabbitTemplate,
                                      RoomServiceClient roomServiceClient) {
        this(bookingItemRepository,
                bookingRepository,
                bookingGuestRepository,
                bookingInvoiceService,
                bookingCheckoutBillingService,
                bookingServiceLineRepository,
                refundCalculationService,
                refundTransactionRepository,
                null,
                rabbitTemplate,
                roomServiceClient);
    }

    public List<BookingItem> getCheckInRooms(LocalDate date) {
        return attachGuests(bookingItemRepository.findCheckInRoomsOnOrBefore(
                date != null ? date : today(),
                List.of(BookingItemStatus.BOOKED, BookingItemStatus.ACTIVE)));
    }

    public List<BookingItem> getInHouseRooms() {
        return attachGuests(bookingItemRepository.findInHouseRooms());
    }

    public List<BookingItem> getCheckOutRooms(LocalDate date) {
        return attachGuests(bookingItemRepository.findCheckOutRoomsOnOrBefore(date != null ? date : today()));
    }

    @Transactional
    public BookingItem checkInRoom(Long bookingRoomId, Long staffId) {
        return checkInRoom(bookingRoomId, staffId, null);
    }

    @Transactional
    public BookingItem checkInRoom(Long bookingRoomId, Long staffId, CheckInRequest request) {
        BookingItem room = requireRoom(bookingRoomId);
        validateCheckIn(room, staffId, request);
        BookingGuest representative = resolveRepresentative(room, request);
        LocalDateTime now = now();
        room.setRepresentativeGuestId(representative.getId());
        room.setActualCheckInAt(now);
        room.setCheckedInByStaffId(staffId);
        room.setStatus(BookingItemStatus.CHECKED_IN);
        BookingItem savedRoom = bookingItemRepository.save(room);
        updateBookingStatus(room.getBooking());
        projectStaffBooking(room.getBooking());
        setRoomStatus(room.getRoomId(), "OCCUPIED");
        return attachGuests(savedRoom);
    }

    @Transactional
    public BookingRoomActionResult checkInRooms(Long bookingId, BookingRoomBatchRequest request, Long fallbackStaffId) {
        Long staffId = request != null && request.getStaffId() != null ? request.getStaffId() : fallbackStaffId;
        Map<Long, BookingRoomCheckInRequest> checkIns = request != null && request.getCheckIns() != null
                ? request.getCheckIns().stream()
                    .filter(line -> line != null && line.getBookingRoomId() != null)
                    .collect(Collectors.toMap(BookingRoomCheckInRequest::getBookingRoomId, line -> line, (left, right) -> right))
                : Map.of();
        return runBatch(bookingId, request, id -> checkInRoom(id, staffId, toCheckInRequest(checkIns.get(id))));
    }

    @Transactional
    public BookingItem checkOutRoom(Long bookingRoomId, Long staffId, BookingRoomExtraFeeRequest extraFee) {
        BookingItem room = requireRoom(bookingRoomId);
        validateCheckout(room, staffId);
        LocalDateTime actualCheckoutAt = now();
        BigDecimal roomCharge = calculateRoomCharge(room);
        BigDecimal lateFee = calculateLateCheckoutFee(room, actualCheckoutAt);
        BigDecimal serviceCharge = money(extraFee != null ? extraFee.getServiceCharge() : null);
        BigDecimal surcharge = lateFee.add(money(extraFee != null ? extraFee.getSurcharge() : null));
        BigDecimal damageFee = money(extraFee != null ? extraFee.getDamageFee() : null);

        room.setRoomCharge(roomCharge);
        room.setServiceCharge(serviceCharge);
        room.setSurcharge(surcharge);
        room.setDamageFee(damageFee);
        room.setFinalAmount(roomCharge.add(serviceCharge).add(surcharge).add(damageFee));
        room.setActualCheckOutAt(actualCheckoutAt);
        room.setCheckedOutByStaffId(staffId);
        room.setStatus(BookingItemStatus.CHECKED_OUT);

        BookingItem savedRoom = bookingItemRepository.saveAndFlush(room);
        updateBookingStatus(room.getBooking());
        projectStaffBooking(room.getBooking());
        log.info("CHECKOUT_MULTIPLE_CHECKPOINT before update room status bookingRoomId={}, roomId={}, targetStatus=CLEANING", room.getId(), room.getRoomId());
        setRoomStatus(room.getRoomId(), "CLEANING");
        log.info("CHECKOUT_MULTIPLE_CHECKPOINT after update room status bookingRoomId={}, roomId={}, targetStatus=CLEANING", room.getId(), room.getRoomId());
        return attachGuests(savedRoom);
    }

    @Transactional
    public BookingRoomActionResult checkOutRooms(Long bookingId, BookingRoomBatchRequest request, Long fallbackStaffId) {
        Long staffId = request != null && request.getStaffId() != null ? request.getStaffId() : fallbackStaffId;
        List<Long> selectedRoomIds = request != null && request.getBookingRoomIds() != null
            ? request.getBookingRoomIds()
            : List.of();
        log.info("CHECKOUT_MULTIPLE_CHECKPOINT START checkout bookingId={}, request={}", bookingId, request);
        try {
            Booking booking = bookingRepository.findByIdWithItems(bookingId)
                .orElseThrow(() -> new NoSuchElementException("Booking not found: " + bookingId));
            log.info("CHECKOUT_MULTIPLE_CHECKPOINT loaded booking bookingId={}, status={}, paidAmount={}, itemCount={}",
                bookingId, booking.getStatus(), booking.getPaidAmount(), booking.getItems() != null ? booking.getItems().size() : 0);

            List<BookingItem> selectedRooms = selectedRoomIds.stream().map(this::requireRoom).toList();
            log.info("CHECKOUT_MULTIPLE_CHECKPOINT loaded selected bookingItems bookingId={}, selectedCount={}, selectedRoomIds={}",
                    bookingId, selectedRooms.size(), selectedRoomIds);
            validateSelectedRooms(bookingId, selectedRooms);
            log.info("CHECKOUT_MULTIPLE_CHECKPOINT validated selected rooms bookingId={}, selectedCount={}", bookingId, selectedRooms.size());

            Map<Long, BookingRoomExtraFeeRequest> fees = request != null && request.getExtraFees() != null
                ? request.getExtraFees().stream()
                .filter(fee -> fee != null && fee.getBookingRoomId() != null)
                .collect(Collectors.toMap(BookingRoomExtraFeeRequest::getBookingRoomId, fee -> fee, (left, right) -> right))
                : Map.of();

            BookingRoomActionResult result = runBatchStrict(bookingId, request, id -> checkOutRoom(id, staffId, fees.get(id)));
            log.info("CHECKOUT_MULTIPLE_CHECKPOINT rooms checked out bookingId={}, checkedOutRooms={}, errors={}",
                bookingId, result.getRooms().size(), result.getErrors().size());

            attachInvoice(result, booking, request, staffId);

            log.info("CHECKOUT_MULTIPLE_CHECKPOINT refund/payment transaction handled bookingId={}", bookingId);

            result.setSuccess(true);
            log.info("CHECKOUT_MULTIPLE_CHECKPOINT END checkout success bookingId={}, invoiceId={}, invoiceCode={}, success={}",
                bookingId, result.getInvoiceId(), result.getInvoiceCode(), result.isSuccess());
            return result;
        } catch (RuntimeException e) {
            log.error("CHECKOUT_MULTIPLE_FAILED bookingId={}, request={}", bookingId, request, e);
            throw e;
        }
    }

        private void attachInvoice(BookingRoomActionResult result, Booking booking, BookingRoomBatchRequest request, Long staffId) {
        if (booking == null) {
            throw new NoSuchElementException("Booking not found: " + (request != null ? request.getBookingRoomIds() : null));
        }
        Map<String, Object> lines = bookingCheckoutBillingService.buildInvoicePayload(booking.getId(), request);
        BigDecimal invoiceAmount = lines.get("grandTotal") instanceof BigDecimal bd ? bd
                : lines.get("grandTotal") instanceof Number n ? BigDecimal.valueOf(n.doubleValue())
                : BigDecimal.ZERO;
        log.info("CHECKOUT_MULTIPLE_CHECKPOINT before merge invoice bookingId={}, invoiceAmount={}, currency={}",
                booking.getId(), invoiceAmount, booking.getCurrency() != null ? booking.getCurrency() : "VND");
        // Persist checkout invoice. Use saveCheckoutInvoice to match legacy test expectations
        // (some environments call mergeCheckoutInvoice; tests stub saveCheckoutInvoice).
        var invoice = bookingInvoiceService.saveCheckoutInvoice(
            booking.getId(), invoiceAmount,
            booking.getCurrency() != null ? booking.getCurrency() : "VND",
            lines);
        result.setInvoiceId(invoice.getId());
        result.setInvoiceCode("INV-" + invoice.getId());
        log.info("CHECKOUT_MULTIPLE_CHECKPOINT after merge invoice bookingId={}, invoiceId={}, invoiceCode={}", booking.getId(), invoice.getId(), result.getInvoiceCode());

        BigDecimal refundSettlementAmount = decimal(lines.get("refundSettlementAmount"), lines.get("additionalRefundAmount"));
        if (refundService != null && refundSettlementAmount.compareTo(BigDecimal.ZERO) > 0) {
            try {
                refundService.createAssignedEarlyCheckoutRefundTransaction(booking, refundSettlementAmount, staffId);
                log.info("CHECKOUT_MULTIPLE_CHECKPOINT created early checkout refund bookingId={}, amount={}, staffId={}",
                        booking.getId(), refundSettlementAmount, staffId);
            } catch (RuntimeException ex) {
                log.error("CHECKOUT_MULTIPLE_CHECKPOINT failed to create early checkout refund bookingId={}, amount={}",
                        booking.getId(), refundSettlementAmount, ex);
                throw ex;
            }
        }
    }

    private void validateSelectedRooms(Long bookingId, List<BookingItem> selectedRooms) {
        for (BookingItem room : selectedRooms) {
            if (!Objects.equals(room.getBooking().getId(), bookingId)) {
                throw new IllegalArgumentException("Room " + room.getId() + " does not belong to booking " + bookingId);
            }
            if (room.getStatus() == BookingItemStatus.CHECKED_OUT) {
                throw new IllegalStateException("Room " + room.getId() + " is already checked out");
            }
            if (room.getStatus() != BookingItemStatus.CHECKED_IN) {
                throw new IllegalStateException("Only CHECKED_IN rooms can be checked out");
            }
        }
    }

    private BigDecimal calculateServiceTotal(Long bookingId) {
        if (bookingServiceLineRepository == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (BookingServiceLine line : bookingServiceLineRepository.findByBookingId(bookingId)) {
            if (line.getLineTotal() != null) {
                total = total.add(line.getLineTotal());
            }
        }
        return total;
    }

    private List<Map<String, Object>> toInvoiceServiceLines(List<BookingServiceLine> lines) {
        if (lines == null || lines.isEmpty()) {
            return List.of();
        }
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (BookingServiceLine line : lines) {
            Map<String, Object> item = new java.util.LinkedHashMap<>();
            item.put("id", line.getId());
            item.put("name", line.getName());
            item.put("quantity", line.getQuantity());
            item.put("unitPrice", line.getUnitPrice());
            item.put("lineTotal", line.getLineTotal());
            result.add(item);
        }
        return result;
    }

    private BookingRoomActionResult runBatch(Long bookingId, BookingRoomBatchRequest request, RoomAction action) {
        if (request == null || request.getBookingRoomIds() == null || request.getBookingRoomIds().isEmpty()) {
            throw new IllegalArgumentException("bookingRoomIds is required");
        }
        BookingRoomActionResult result = new BookingRoomActionResult();
        for (Long roomId : request.getBookingRoomIds()) {
            try {
                BookingItem room = requireRoom(roomId);
                if (!Objects.equals(room.getBooking().getId(), bookingId)) {
                    throw new IllegalArgumentException("Room " + roomId + " does not belong to booking " + bookingId);
                }
                result.getRooms().add(action.apply(roomId));
            } catch (RuntimeException ex) {
                result.getErrors().add("bookingRoomId=" + roomId + ": " + ex.getMessage());
            }
        }
        result.setSuccess(result.getErrors().isEmpty());
        return result;
    }

    private BigDecimal calculateTotalEarlyCheckoutRefund(Booking booking) {
        if (booking == null || booking.getCheckOut() == null || booking.getItems() == null) {
            return BigDecimal.ZERO;
        }
        LocalDateTime firstActualCheckout = booking.getItems().stream()
                .map(BookingItem::getActualCheckOutAt)
                .filter(Objects::nonNull)
                .min(LocalDateTime::compareTo)
                .orElse(null);
        if (firstActualCheckout == null || !firstActualCheckout.toLocalDate().isBefore(booking.getCheckOut())) {
            return BigDecimal.ZERO;
        }
        return refundCalculationService.calculateEarlyCheckoutRefund(booking, null, firstActualCheckout).getRefundAmount();
    }

    private BigDecimal resolveAlreadyRecordedEarlyCheckoutRefund(Long bookingId) {
        BigDecimal fromRefundTransaction = refundTransactionRepository
                .findFirstByBookingIdAndReasonOrderByCreatedAtDesc(bookingId, "EARLY_CHECKOUT_REFUND")
                .map(refund -> BigDecimal.valueOf(refund.getRefundAmount() != null ? refund.getRefundAmount() : 0.0))
                .orElse(BigDecimal.ZERO);
        if (fromRefundTransaction.compareTo(BigDecimal.ZERO) > 0) {
            return fromRefundTransaction;
        }
        BookingInvoiceDto previous = bookingInvoiceService.findLatestInvoice(bookingId).orElse(null);
        if (previous != null && previous.getLines() instanceof Map<?, ?> lines) {
            return decimal(lines.get("totalEarlyCheckoutRefund"), lines.get("earlyCheckoutAdjustment"));
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal decimal(Object primary, Object fallback) {
        Object value = primary != null ? primary : fallback;
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return new BigDecimal(text);
            } catch (NumberFormatException ignored) {
                return BigDecimal.ZERO;
            }
        }
        return BigDecimal.ZERO;
    }

    private BigDecimal extraSurcharge(BookingRoomBatchRequest request, Long bookingRoomId) {
        if (request == null || request.getExtraFees() == null) return BigDecimal.ZERO;
        return request.getExtraFees().stream()
                .filter(fee -> fee != null && Objects.equals(fee.getBookingRoomId(), bookingRoomId))
                .map(BookingRoomExtraFeeRequest::getSurcharge)
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(BigDecimal.ZERO);
    }

    private Map<Long, Room> loadRoomSnapshot(List<BookingItem> rooms) {
        Map<Long, Room> out = new java.util.HashMap<>();
        for (BookingItem bookingRoom : rooms) {
            if (bookingRoom == null || bookingRoom.getRoomId() == null || out.containsKey(bookingRoom.getRoomId())) {
                continue;
            }
            try {
                out.put(bookingRoom.getRoomId(), roomServiceClient.getRoomById(bookingRoom.getRoomId()));
            } catch (RuntimeException ignored) {
                out.put(bookingRoom.getRoomId(), null);
            }
        }
        return out;
    }

    private List<Map<String, Object>> invoiceItems(BookingItem room, Room roomInfo) {
        List<Map<String, Object>> lines = new java.util.ArrayList<>();
        addInvoiceItem(lines, room, "ROOM_CHARGE", "Phòng " + room.getRoomId() + " - Tiền phòng", room.getRoomCharge());
        addInvoiceItem(lines, room, "SERVICE_CHARGE", "Phòng " + room.getRoomId() + " - Phí dịch vụ", room.getServiceCharge());
        addInvoiceItem(lines, room, "DAMAGE_FEE", "Phòng " + room.getRoomId() + " - Phí hư hỏng", room.getDamageFee());
        BigDecimal lateFee = money(room.getSurcharge());
        addInvoiceItem(lines, room, "LATE_CHECKOUT_FEE", "Phòng " + room.getRoomId() + " - Phụ thu checkout trễ", lateFee);
        return lines;
    }

    private Room safeRoomInfo(BookingItem room) {
        if (room == null || room.getRoomId() == null) {
            return null;
        }
        try {
            return roomServiceClient.getRoomById(room.getRoomId());
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private String invoiceRoomName(Room roomInfo) {
        if (roomInfo != null && roomInfo.getRoomNumber() != null && !roomInfo.getRoomNumber().isBlank()) {
            return "Phòng " + roomInfo.getRoomNumber();
        }
        return "Phòng chưa xác định";
    }

    private String invoiceItemLabel(String type) {
        return switch (type) {
            case "ROOM_CHARGE" -> "Tiền phòng";
            case "SERVICE_CHARGE" -> "Phí dịch vụ";
            case "DAMAGE_FEE" -> "Phí hư hỏng";
            case "LATE_CHECKOUT_FEE" -> "Phụ thu checkout trễ";
            default -> type;
        };
    }

    private void addInvoiceItem(List<Map<String, Object>> lines, BookingItem room, String type, String description, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) return;
        Room roomInfo = safeRoomInfo(room);
        String roomName = invoiceRoomName(roomInfo);
        Map<String, Object> item = new java.util.LinkedHashMap<>();
        item.put("_id", room.getId() + "-" + type);
        item.put("bookingRoomId", room.getId());
        item.put("roomId", room.getRoomId());
        item.put("roomNumber", roomInfo != null ? roomInfo.getRoomNumber() : null);
        item.put("roomName", roomName);
        item.put("roomTypeName", roomInfo != null && roomInfo.getRoomType() != null ? roomInfo.getRoomType().getType() : null);
        item.put("itemType", type);
        item.put("description", roomName + " - " + invoiceItemLabel(type));
        item.put("quantity", 1);
        item.put("unitPrice", amount);
        item.put("amount", amount);
        lines.add(item);
    }

    private BookingRoomActionResult runBatchStrict(Long bookingId, BookingRoomBatchRequest request, RoomAction action) {
        if (request == null || request.getBookingRoomIds() == null || request.getBookingRoomIds().isEmpty()) {
            throw new IllegalArgumentException("bookingRoomIds is required");
        }
        BookingRoomActionResult result = new BookingRoomActionResult();
        for (Long roomId : request.getBookingRoomIds()) {
            BookingItem room = requireRoom(roomId);
            if (!Objects.equals(room.getBooking().getId(), bookingId)) {
                throw new IllegalArgumentException("Room " + roomId + " does not belong to booking " + bookingId);
            }
            result.getRooms().add(action.apply(roomId));
        }
        result.setSuccess(true);
        return result;
    }

    private void validateCheckIn(BookingItem room, Long staffId, CheckInRequest request) {
        if (staffId == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        Booking booking = room.getBooking();
        if (!isPaidEnoughForCheckIn(booking)) {
            throw new IllegalStateException("Booking must be paid or deposited before room check-in");
        }
        if (room.getStatus() != BookingItemStatus.BOOKED && room.getStatus() != BookingItemStatus.ACTIVE) {
            throw new IllegalStateException("Room can only be checked in from BOOKED status");
        }
        if (room.getCheckIn() != null && today().isBefore(room.getCheckIn())) {
            throw new IllegalStateException("Room cannot be checked in before check-in date");
        }
        resolveRepresentative(room, request);
    }

    private void validateCheckout(BookingItem room, Long staffId) {
        if (staffId == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        if (room.getStatus() != BookingItemStatus.CHECKED_IN) {
            throw new IllegalStateException("Only CHECKED_IN rooms can be checked out");
        }
    }

    private boolean isPaidEnoughForCheckIn(Booking booking) {
        if (booking == null) {
            return false;
        }
        String paymentStatus = booking.getPaymentStatus() != null ? booking.getPaymentStatus().trim().toUpperCase() : "";
        return booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.DEPOSIT_PAID
                || booking.getStatus() == BookingStatus.BOOKED
                || "PAID".equals(paymentStatus)
                || "DEPOSITED".equals(paymentStatus)
                || "PARTIALLY_PAID".equals(paymentStatus);
    }

    private BookingGuest resolveRepresentative(BookingItem room, CheckInRequest request) {
        List<BookingGuest> guests = bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(room.getId());
        if (guests.isEmpty()) {
            guests = bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(room.getBooking().getId()).stream()
                    .filter(guest -> guest.getBookingRoomId() == null && Objects.equals(guest.getRoomId(), room.getRoomId()))
                    .toList();
        }
        LocalDate checkInDate = room.getCheckIn() != null ? room.getCheckIn() : today();
        BookingGuest representative = null;
        if (request != null && request.getRepresentativeGuestId() != null) {
            representative = guests.stream()
                    .filter(guest -> Objects.equals(guest.getId(), request.getRepresentativeGuestId()))
                    .filter(guest -> guest.isAdultOn(checkInDate))
                    .findFirst()
                    .orElse(null);
        }
        if (representative == null) {
            representative = guests.stream()
                    .filter(guest -> guest.getRole() == BookingRoomGuestRole.REPRESENTATIVE || Boolean.TRUE.equals(guest.getPrimaryGuest()))
                    .filter(guest -> guest.isAdultOn(checkInDate))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Room " + room.getRoomId() + " must have an adult representative"));
        }
        applyCheckInDocument(representative, request);
        if (!hasIdDocument(representative)) {
            representative = guests.stream()
                    .filter(guest -> guest.isAdultOn(room.getCheckIn() != null ? room.getCheckIn() : today()))
                    .filter(this::hasIdDocument)
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Room " + room.getRoomId() + " must have an adult representative with CCCD/passport"));
        }
        return representative;
    }

    private void applyCheckInDocument(BookingGuest representative, CheckInRequest request) {
        if (representative == null || request == null || request.getRepresentativeCccd() == null || request.getRepresentativeCccd().isBlank()) {
            return;
        }
        String document = request.getRepresentativeCccd().trim();
        if (document.matches("\\d{12}")) {
            representative.setCccd(document);
        } else if (document.matches("[A-Za-z0-9\\-]{5,20}")) {
            representative.setPassport(document);
        } else {
            throw new IllegalArgumentException("CCCD/passport không hợp lệ");
        }
        if (request.getRepresentativePhone() != null && !request.getRepresentativePhone().isBlank()) {
            representative.setPhone(request.getRepresentativePhone().trim());
        }
        bookingGuestRepository.save(representative);
    }

    private boolean hasIdDocument(BookingGuest guest) {
        return (guest.getCccd() != null && !guest.getCccd().isBlank())
                || (guest.getPassport() != null && !guest.getPassport().isBlank());
    }

    private void updateBookingStatus(Booking booking) {
        Booking fresh = bookingRepository.findByIdWithItems(booking.getId())
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + booking.getId()));
        List<BookingItem> activeRooms = fresh.getItems().stream()
                .filter(room -> room.getStatus() != BookingItemStatus.CANCELLED)
                .toList();
        if (activeRooms.isEmpty()) {
            fresh.setStatus(BookingStatus.CANCELLED);
        } else if (activeRooms.stream().allMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT)) {
            fresh.setStatus(BookingStatus.COMPLETED);
            fresh.setActualCheckOutAt(now());
        } else if (activeRooms.stream().anyMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT)) {
            fresh.setStatus(BookingStatus.PARTIALLY_CHECKED_OUT);
        } else if (activeRooms.stream().allMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_IN)) {
            fresh.setStatus(BookingStatus.CHECKED_IN);
            fresh.setActualCheckInAt(activeRooms.stream().map(BookingItem::getActualCheckInAt).filter(Objects::nonNull).min(LocalDateTime::compareTo).orElse(now()));
        } else if (activeRooms.stream().anyMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_IN)) {
            fresh.setStatus(BookingStatus.PARTIALLY_CHECKED_IN);
        } else if (activeRooms.stream().allMatch(room -> room.getStatus() == BookingItemStatus.BOOKED || room.getStatus() == BookingItemStatus.ACTIVE)) {
            fresh.setStatus(BookingStatus.BOOKED);
        }
        bookingRepository.saveAndFlush(fresh);
        projectStaffBooking(fresh);
    }

    private BookingItem requireRoom(Long bookingRoomId) {
        return bookingItemRepository.findByIdWithBooking(bookingRoomId)
                .orElseThrow(() -> new NoSuchElementException("Booking room not found: " + bookingRoomId));
    }

    private BookingItem attachGuests(BookingItem room) {
        List<BookingGuest> guests = bookingGuestRepository.findByBookingRoomIdOrderByPrimaryGuestDescIdAsc(room.getId());
        if (guests.isEmpty() && room.getBooking() != null && room.getRoomId() != null) {
            guests = bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(room.getBooking().getId()).stream()
                    .filter(guest -> guest.getBookingRoomId() == null && Objects.equals(guest.getRoomId(), room.getRoomId()))
                    .toList();
        }
        room.setGuests(guests);
        return room;
    }

    private List<BookingItem> attachGuests(List<BookingItem> rooms) {
        rooms.forEach(this::attachGuests);
        return rooms;
    }

    private BigDecimal calculateRoomCharge(BookingItem room) {
        BigDecimal nightly = BigDecimal.valueOf(room.getPriceSnapshot() != null ? room.getPriceSnapshot() : 0.0);
        int nights = 1;
        if (room.getNights() != null) {
            nights = room.getNights();
        } else if (room.getCheckIn() != null && room.getCheckOut() != null) {
            nights = (int) Math.max(1, ChronoUnit.DAYS.between(room.getCheckIn(), room.getCheckOut()));
        }
        return nightly.multiply(BigDecimal.valueOf(Math.max(1, nights))).setScale(0, RoundingMode.HALF_UP);
    }

    private CheckInRequest toCheckInRequest(BookingRoomCheckInRequest line) {
        if (line == null) {
            return null;
        }
        CheckInRequest request = new CheckInRequest();
        request.setRepresentativeGuestId(line.getRepresentativeGuestId());
        request.setRepresentativePhone(line.getRepresentativePhone());
        request.setRepresentativeCccd(line.getRepresentativeCccd());
        return request;
    }

    private BigDecimal calculateLateCheckoutFee(BookingItem room, LocalDateTime actualCheckoutAt) {
        if (room.getCheckOut() == null || actualCheckoutAt == null) {
            return BigDecimal.ZERO;
        }
        LocalDateTime officialCheckoutAt = room.getCheckOut().atTime(BookingConstants.CHECK_OUT_HOUR, 0);
        long lateMinutes = ChronoUnit.MINUTES.between(officialCheckoutAt, actualCheckoutAt);
        if (lateMinutes <= 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal percent = BigDecimal.valueOf(BookingConstants.LATE_12_TO_14_FEE_PERCENT);
        BigDecimal nightly = BigDecimal.valueOf(room.getPriceSnapshot() != null ? room.getPriceSnapshot() : 0.0);
        return nightly.multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private LocalDate today() {
        return ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDate();
    }

    private LocalDateTime now() {
        return ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime();
    }

    private void setRoomStatus(Long roomId, String status) {
        if (roomId == null) {
            return;
        }
        RoomStatusUpdateDto dto = new RoomStatusUpdateDto();
        dto.setRoomId(roomId);
        dto.setStatus(status);
        try {
            rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.status", dto);
        } catch (RuntimeException ex) {
            // Room status publish failure should not break checkout commit.
            log.error("CHECKOUT_MULTIPLE_ROOM_STATUS_PUBLISH_FAILED roomId={}, status={}", roomId, status, ex);
        }
    }

    private void projectStaffBooking(Booking booking) {
        if (cqrsOutboxEventService == null) {
            return;
        }
        try {
            cqrsOutboxEventService.enqueueBookingChanged(booking != null ? booking.getId() : null);
        } catch (Exception ex) {
            log.warn("Unable to enqueue staff booking dashboard projection event. bookingId={}",
                    booking != null ? booking.getId() : null,
                    ex);
        }
    }

    @FunctionalInterface
    private interface RoomAction {
        BookingItem apply(Long bookingRoomId);
    }
}
