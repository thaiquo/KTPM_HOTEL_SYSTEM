package iuh.fit.hotelsystem_booking.cqrs.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingInvoiceReadModel;
import iuh.fit.hotelsystem_booking.cqrs.readmodel.BookingRefundReadModel;
import iuh.fit.hotelsystem_booking.cqrs.readmodel.StaffBookingDashboardReadModel;
import iuh.fit.hotelsystem_booking.cqrs.repository.BookingInvoiceReadModelRepository;
import iuh.fit.hotelsystem_booking.cqrs.repository.BookingRefundReadModelRepository;
import iuh.fit.hotelsystem_booking.cqrs.repository.StaffBookingDashboardReadModelRepository;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BookingReadModelProjector {

    private final BookingInvoiceReadModelRepository invoiceReadRepository;
    private final BookingRefundReadModelRepository refundReadRepository;
    private final StaffBookingDashboardReadModelRepository staffBookingReadRepository;
    private final BookingRepository bookingRepository;
    private final BookingGuestRepository bookingGuestRepository;
    private final BookingInvoiceRepository invoiceRepository;
    private final RefundTransactionRepository refundRepository;
    private final ObjectMapper objectMapper;

    public BookingReadModelProjector(BookingInvoiceReadModelRepository invoiceReadRepository,
                                     BookingRefundReadModelRepository refundReadRepository,
                                     StaffBookingDashboardReadModelRepository staffBookingReadRepository,
                                     BookingRepository bookingRepository,
                                     BookingGuestRepository bookingGuestRepository,
                                     BookingInvoiceRepository invoiceRepository,
                                     RefundTransactionRepository refundRepository,
                                     ObjectMapper objectMapper) {
        this.invoiceReadRepository = invoiceReadRepository;
        this.refundReadRepository = refundReadRepository;
        this.staffBookingReadRepository = staffBookingReadRepository;
        this.bookingRepository = bookingRepository;
        this.bookingGuestRepository = bookingGuestRepository;
        this.invoiceRepository = invoiceRepository;
        this.refundRepository = refundRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void projectInvoice(BookingInvoice invoice) {
        if (invoice == null || invoice.getId() == null || invoice.getBookingId() == null) {
            return;
        }

        Booking booking = bookingRepository.findByIdWithItems(invoice.getBookingId())
                .orElse(null);
        Map<String, Object> lines = readLines(invoice.getLinesJson());
        BookingInvoiceReadModel model = invoiceReadRepository.findById(invoice.getId())
                .orElseGet(BookingInvoiceReadModel::new);

        model.setInvoiceId(invoice.getId());
        model.setInvoiceCode(firstText(invoice.getInvoiceCode(), "INV-" + String.format("%06d", invoice.getId())));
        model.setBookingId(invoice.getBookingId());
        model.setBookingCode(booking != null ? booking.getBookingCode() : null);
        model.setCustomerUserId(booking != null ? booking.getUserId() : null);
        model.setInvoiceStatus(invoice.getInvoiceStatus());
        model.setBookingStatus(booking != null && booking.getStatus() != null ? booking.getStatus().name() : null);
        model.setPaymentStatus(firstText(invoice.getPaymentStatus(), booking != null ? booking.getPaymentStatus() : null));
        model.setCreatedAt(invoice.getCreatedAt());
        model.setUpdatedAt(LocalDateTime.now());

        applyGuest(model, invoice, invoice.getBookingId());
        applyRoomsAndStaff(model, booking, lines);
        applyMoney(model, invoice, lines);
        applyRefundStatus(model, invoice.getBookingId());

        invoiceReadRepository.save(model);
        if (booking != null) {
            projectStaffBooking(booking);
        }
    }

    @Transactional
    public void projectRefund(RefundTransaction refund) {
        if (refund == null || refund.getId() == null || refund.getBookingId() == null) {
            return;
        }

        Booking booking = bookingRepository.findByIdWithItems(refund.getBookingId()).orElse(null);
        BookingRefundReadModel model = refundReadRepository.findById(refund.getId())
                .orElseGet(BookingRefundReadModel::new);

        model.setRefundId(refund.getId());
        model.setBookingId(refund.getBookingId());
        model.setBookingCode(booking != null ? booking.getBookingCode() : null);
        model.setUserId(refund.getUserId() != null ? refund.getUserId() : booking != null ? booking.getUserId() : null);
        model.setPaymentTransactionId(refund.getPaymentTransactionId());
        model.setPaidAmount(valueOrZero(refund.getPaidAmount()));
        model.setCancellationFee(valueOrZero(refund.getCancellationFee()));
        model.setRefundAmount(valueOrZero(refund.getRefundAmount()));
        model.setRefundMethod(refund.getRefundMethod());
        model.setStatus(refund.getStatus() != null ? refund.getStatus().name() : null);
        model.setPublicStatus(refund.getPublicStatus() != null ? refund.getPublicStatus().name() : null);
        model.setReason(refund.getReason());
        model.setAssignedTo(refund.getAssignedTo());
        model.setProcessedByStaffId(refund.getProcessedByStaffId());
        model.setDueAt(refund.getDueAt());
        model.setCreatedAt(refund.getCreatedAt());
        model.setUpdatedAt(refund.getUpdatedAt() != null ? refund.getUpdatedAt() : LocalDateTime.now());
        model.setCustomerName(resolveCustomerName(refund.getBookingId()));

        refundReadRepository.save(model);

        invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(refund.getBookingId())
                .ifPresent(this::projectInvoice);
        if (booking != null) {
            projectStaffBooking(booking);
        }
    }

    @Transactional
    public void projectStaffBooking(Booking booking) {
        if (booking == null || booking.getId() == null) {
            return;
        }
        Booking hydrated = bookingRepository.findByIdWithItems(booking.getId()).orElse(booking);
        StaffBookingDashboardReadModel model = staffBookingReadRepository.findById(hydrated.getId())
                .orElseGet(StaffBookingDashboardReadModel::new);

        model.setId(hydrated.getId());
        model.setBookingCode(hydrated.getBookingCode());
        model.setUserId(hydrated.getUserId());
        model.setCheckIn(hydrated.getCheckIn());
        model.setCheckOut(hydrated.getCheckOut());
        model.setStatus(hydrated.getStatus() != null ? hydrated.getStatus().name() : null);
        model.setPaymentStatus(hydrated.getPaymentStatus());
        model.setRatePlan(hydrated.getRatePlan() != null ? hydrated.getRatePlan().name() : null);
        model.setSource(hydrated.getSource() != null ? hydrated.getSource().name() : null);
        model.setTotalPrice(valueOrZero(hydrated.getTotalPrice()));
        model.setFinalTotal(valueOrZero(hydrated.getFinalTotal()));
        model.setPaidAmount(valueOrZero(hydrated.getPaidAmount()));
        model.setDepositAmount(valueOrZero(hydrated.getDepositAmount()));
        model.setCreatedAt(hydrated.getCreatedAt());
        model.setUpdatedAt(LocalDateTime.now());

        List<BookingItem> items = hydrated.getItems();
        int itemCount = items != null ? items.size() : 0;
        model.setTotalRooms(hydrated.getTotalRooms() != null ? hydrated.getTotalRooms() : itemCount);
        model.setTotalGuests(hydrated.getTotalGuests() != null ? hydrated.getTotalGuests() : hydrated.getGuestCount());
        model.setRoomIds(items != null ? items.stream()
                .map(BookingItem::getRoomId)
                .filter(id -> id != null)
                .map(String::valueOf)
                .collect(Collectors.joining(", ")) : null);
        model.setActualCheckInAt(resolveActualCheckIn(hydrated));
        model.setActualCheckOutAt(resolveActualCheckOut(hydrated));

        BookingGuest representative = pickRepresentative(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(hydrated.getId()));
        if (representative != null) {
            model.setCustomerName(representative.getFullName());
            model.setRepresentativeName(representative.getFullName());
            model.setRepresentativePhone(representative.getPhone());
            model.setRepresentativeCccd(firstText(representative.getCccd(), representative.getPassport()));
        }
        applyStaffRefundStatus(model, hydrated.getId());

        staffBookingReadRepository.save(model);
    }

    private void applyGuest(BookingInvoiceReadModel model, BookingInvoice invoice, Long bookingId) {
        BookingGuest representative = pickRepresentative(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(bookingId));
        model.setCustomerName(firstText(invoice.getCustomerName(), representative != null ? representative.getFullName() : null));
        model.setCustomerPhone(firstText(invoice.getCustomerPhone(), representative != null ? representative.getPhone() : null));
    }

    @SuppressWarnings("unchecked")
    private void applyRoomsAndStaff(BookingInvoiceReadModel model, Booking booking, Map<String, Object> lines) {
        Set<String> rooms = new LinkedHashSet<>();
        Object summaries = lines.get("roomSummaries");
        if (summaries instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    Object roomNumber = first(map, "roomNumber", "roomName", "roomCode");
                    if (roomNumber != null && !String.valueOf(roomNumber).isBlank()) {
                        rooms.add(String.valueOf(roomNumber));
                    }
                }
            }
        }
        if (booking != null && booking.getItems() != null) {
            if (rooms.isEmpty()) {
                rooms.addAll(booking.getItems().stream()
                        .map(BookingItem::getRoomId)
                        .filter(id -> id != null)
                        .map(String::valueOf)
                        .collect(Collectors.toCollection(LinkedHashSet::new)));
            }

            Set<Long> checkinStaffIds = new LinkedHashSet<>();
            Set<Long> checkoutStaffIds = new LinkedHashSet<>();
            LocalDateTime checkoutTime = booking.getActualCheckOutAt();
            for (BookingItem item : booking.getItems()) {
                if (item.getCheckedInByStaffId() != null) {
                    checkinStaffIds.add(item.getCheckedInByStaffId());
                }
                if (item.getCheckedOutByStaffId() != null) {
                    checkoutStaffIds.add(item.getCheckedOutByStaffId());
                }
                if (item.getActualCheckOutAt() != null
                        && (checkoutTime == null || item.getActualCheckOutAt().isAfter(checkoutTime))) {
                    checkoutTime = item.getActualCheckOutAt();
                }
            }
            model.setCheckinStaffId(checkinStaffIds.size() == 1 ? checkinStaffIds.iterator().next() : null);
            model.setCheckoutStaffId(checkoutStaffIds.size() == 1 ? checkoutStaffIds.iterator().next() : null);
            model.setCheckoutTime(checkoutTime);
        }
        model.setRoomNumbers(String.join(", ", rooms));
    }

    private void applyMoney(BookingInvoiceReadModel model, BookingInvoice invoice, Map<String, Object> lines) {
        model.setGrossInvoiceAmount(firstNonZero(invoice.getTotalOriginalAmount(), decimal(lines.get("totalOriginalAmount")),
                decimal(lines.get("roomCharge")), invoice.getAmount()));
        model.setTotalRefundAmount(firstNonZero(invoice.getTotalRefundToCustomer(), decimal(lines.get("totalRefundToCustomer")),
                decimal(lines.get("refundSettlementAmount")), decimal(lines.get("additionalRefundAmount"))));
        model.setNetRevenue(firstNonZero(invoice.getTotalActualRevenue(), decimal(lines.get("totalActualRevenue")),
                decimal(lines.get("netRevenue")), invoice.getAmount()));
        model.setPaidAmount(firstNonZero(invoice.getTotalAllocatedPaidAmount(), decimal(lines.get("totalAllocatedPaidAmount")),
                decimal(lines.get("amountPaid")), decimal(lines.get("paidAmount"))));
        model.setRemainingAmount(firstNonZero(invoice.getRemainingBalance(), decimal(lines.get("remainingBalance")),
                decimal(lines.get("additionalChargeAmount"))));
    }

    private void applyRefundStatus(BookingInvoiceReadModel model, Long bookingId) {
        Optional<RefundTransaction> refund = refundRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(bookingId, "EARLY_CHECKOUT_REFUND")
                .or(() -> refundRepository.findFirstByBookingId(bookingId));
        model.setRefundStatus(refund.map(value -> value.getStatus() != null ? value.getStatus().name() : null).orElse(null));
    }

    private String resolveCustomerName(Long bookingId) {
        return Optional.ofNullable(pickRepresentative(bookingGuestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(bookingId)))
                .map(BookingGuest::getFullName)
                .orElse(null);
    }

    private BookingGuest pickRepresentative(List<BookingGuest> guests) {
        if (guests == null || guests.isEmpty()) {
            return null;
        }
        return guests.stream().filter(guest -> Boolean.TRUE.equals(guest.getCheckInPerson())).findFirst()
                .or(() -> guests.stream().filter(guest -> Boolean.TRUE.equals(guest.getPrimaryGuest())).findFirst())
                .orElse(guests.get(0));
    }

    private Map<String, Object> readLines(String linesJson) {
        if (linesJson == null || linesJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(linesJson, new TypeReference<>() {});
        } catch (Exception ignored) {
            return Map.of();
        }
    }

    private Object first(Map<?, ?> map, String... keys) {
        for (String key : keys) {
            Object value = map.get(key);
            if (value != null) {
                return value;
            }
        }
        return null;
    }

    private String firstText(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private void applyStaffRefundStatus(StaffBookingDashboardReadModel model, Long bookingId) {
        Optional<RefundTransaction> refund = refundRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(bookingId, "EARLY_CHECKOUT_REFUND")
                .or(() -> refundRepository.findFirstByBookingId(bookingId));
        model.setRefundStatus(refund.map(value -> value.getStatus() != null ? value.getStatus().name() : null).orElse(null));
    }

    private LocalDateTime resolveActualCheckIn(Booking booking) {
        if (booking.getActualCheckInAt() != null) {
            return booking.getActualCheckInAt();
        }
        if (booking.getItems() == null) {
            return null;
        }
        return booking.getItems().stream()
                .map(BookingItem::getActualCheckInAt)
                .filter(value -> value != null)
                .min(LocalDateTime::compareTo)
                .orElse(null);
    }

    private LocalDateTime resolveActualCheckOut(Booking booking) {
        if (booking.getActualCheckOutAt() != null) {
            return booking.getActualCheckOutAt();
        }
        if (booking.getItems() == null) {
            return null;
        }
        return booking.getItems().stream()
                .map(BookingItem::getActualCheckOutAt)
                .filter(value -> value != null)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private BigDecimal firstNonZero(BigDecimal... values) {
        BigDecimal last = BigDecimal.ZERO;
        for (BigDecimal value : values) {
            if (value == null) {
                continue;
            }
            last = value;
            if (value.compareTo(BigDecimal.ZERO) != 0) {
                return value;
            }
        }
        return last != null ? last : BigDecimal.ZERO;
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
        }
    }

    private Double valueOrZero(Double value) {
        return value != null ? value : 0.0;
    }
}
