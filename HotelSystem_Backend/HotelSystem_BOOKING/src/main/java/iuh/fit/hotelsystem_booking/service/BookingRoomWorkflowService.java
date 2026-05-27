package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingRoomActionResult;
import iuh.fit.hotelsystem_booking.dto.BookingRoomBatchRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomCheckInRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomExtraFeeRequest;
import iuh.fit.hotelsystem_booking.dto.CheckInRequest;
import iuh.fit.hotelsystem_booking.dto.Room;
import iuh.fit.hotelsystem_booking.dto.RoomStatusUpdateDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingRoomGuestRole;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingItemRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class BookingRoomWorkflowService {

    private final BookingItemRepository bookingItemRepository;
    private final BookingRepository bookingRepository;
    private final BookingGuestRepository bookingGuestRepository;
    private final BookingInvoiceService bookingInvoiceService;
    private final RabbitTemplate rabbitTemplate;
    private final RoomServiceClient roomServiceClient;

    public BookingRoomWorkflowService(BookingItemRepository bookingItemRepository,
                                      BookingRepository bookingRepository,
                                      BookingGuestRepository bookingGuestRepository,
                                      BookingInvoiceService bookingInvoiceService,
                                      RabbitTemplate rabbitTemplate,
                                      RoomServiceClient roomServiceClient) {
        this.bookingItemRepository = bookingItemRepository;
        this.bookingRepository = bookingRepository;
        this.bookingGuestRepository = bookingGuestRepository;
        this.bookingInvoiceService = bookingInvoiceService;
        this.rabbitTemplate = rabbitTemplate;
        this.roomServiceClient = roomServiceClient;
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

        BookingItem savedRoom = bookingItemRepository.save(room);
        updateBookingStatus(room.getBooking());
        setRoomStatus(room.getRoomId(), "AVAILABLE");
        return attachGuests(savedRoom);
    }

    @Transactional
    public BookingRoomActionResult checkOutRooms(Long bookingId, BookingRoomBatchRequest request, Long fallbackStaffId) {
        Long staffId = request != null && request.getStaffId() != null ? request.getStaffId() : fallbackStaffId;
        Map<Long, BookingRoomExtraFeeRequest> fees = request != null && request.getExtraFees() != null
                ? request.getExtraFees().stream()
                    .filter(fee -> fee != null && fee.getBookingRoomId() != null)
                    .collect(Collectors.toMap(BookingRoomExtraFeeRequest::getBookingRoomId, fee -> fee, (left, right) -> right))
                : Map.of();
        BookingRoomActionResult result = runBatch(bookingId, request, id -> checkOutRoom(id, staffId, fees.get(id)));
        if (result.isSuccess()) {
            attachInvoice(result, bookingId, request);
        }
        return result;
    }

    private void attachInvoice(BookingRoomActionResult result, Long bookingId, BookingRoomBatchRequest request) {
        Booking booking = bookingRepository.findByIdWithItems(bookingId).orElse(null);
        List<BookingItem> allCheckedOutRooms = booking != null ? booking.getItems().stream()
                .filter(item -> item.getStatus() == BookingItemStatus.CHECKED_OUT)
                .toList() : result.getRooms();
        
        BigDecimal totalRoomCharge = allCheckedOutRooms.stream().map(BookingItem::getRoomCharge).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalServiceCharge = allCheckedOutRooms.stream().map(BookingItem::getServiceCharge).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDamageFee = allCheckedOutRooms.stream().map(BookingItem::getDamageFee).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSurcharge = allCheckedOutRooms.stream().map(BookingItem::getSurcharge).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAmount = allCheckedOutRooms.stream().map(BookingItem::getFinalAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal paidAmount = BigDecimal.valueOf(booking != null && booking.getPaidAmount() != null ? booking.getPaidAmount() : 0.0);
        BigDecimal amountToPay = totalAmount.subtract(paidAmount);
        
        Map<Long, Room> roomSnapshot = loadRoomSnapshot(allCheckedOutRooms);
        List<Map<String, Object>> items = allCheckedOutRooms.stream().flatMap(room -> invoiceItems(room, roomSnapshot.get(room.getRoomId())).stream()).toList();
        
        Map<String, Object> lines = new java.util.LinkedHashMap<>();
        lines.put("invoiceItems", items);
        lines.put("totalRoomCharge", totalRoomCharge);
        lines.put("totalServiceCharge", totalServiceCharge);
        lines.put("totalDamageFee", totalDamageFee);
        lines.put("totalSurcharge", totalSurcharge);
        lines.put("totalAmount", totalAmount);
        lines.put("paidAmount", paidAmount);
        lines.put("amountToPay", amountToPay);
        lines.put("paymentMethod", request != null ? request.getPaymentMethod() : null);
        lines.put("paymentStatus", amountToPay.compareTo(BigDecimal.ZERO) <= 0 ? "PAID" : "PARTIAL");
        lines.put("receivedAmount", request != null ? request.getReceivedAmount() : null);
        lines.put("changeAmount", request != null ? request.getChangeAmount() : null);
        lines.put("createdByStaffId", request != null ? request.getStaffId() : null);
        lines.put("roomCount", allCheckedOutRooms.size());
        
        var invoice = bookingInvoiceService.saveCheckoutInvoice(bookingId, totalAmount, booking != null ? booking.getCurrency() : "VND", lines);
        result.setInvoiceId(invoice.getId());
        result.setInvoiceCode("INV-" + invoice.getId());
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
        bookingRepository.save(fresh);
    }

    private BookingItem requireRoom(Long bookingRoomId) {
        return bookingItemRepository.findByIdWithBooking(bookingRoomId)
                .orElseThrow(() -> new IllegalArgumentException("Booking room not found: " + bookingRoomId));
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
        int nights = room.getNights() != null ? room.getNights() : (int) Math.max(1, ChronoUnit.DAYS.between(room.getCheckIn(), room.getCheckOut()));
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
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, "room.status", dto);
    }

    @FunctionalInterface
    private interface RoomAction {
        BookingItem apply(Long bookingRoomId);
    }
}
