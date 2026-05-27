package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.entity.BookingStay;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@Service
public class BookingInvoiceService {

    private final BookingInvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final BookingGuestService bookingGuestService;
    private final RefundTransactionRepository refundTransactionRepository;
    private final ObjectMapper objectMapper;

    public BookingInvoiceService(BookingInvoiceRepository invoiceRepository,
            BookingRepository bookingRepository,
            BookingStayRepository bookingStayRepository,
            BookingGuestService bookingGuestService,
            RefundTransactionRepository refundTransactionRepository,
            ObjectMapper objectMapper) {
        this.invoiceRepository = invoiceRepository;
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.bookingGuestService = bookingGuestService;
        this.refundTransactionRepository = refundTransactionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public BookingInvoice saveCheckoutInvoice(Long bookingId, BigDecimal amount, String currency,
            Map<String, Object> lines) {
        try {
            BookingInvoice invoice = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                    .orElseGet(BookingInvoice::new);
            if (invoice.getId() == null) {
                invoice.setBookingId(bookingId);
                invoice.setCreatedAt(LocalDateTime.now());
            }
            invoice.setAmount(amount != null ? amount : BigDecimal.ZERO);
            invoice.setCurrency(currency != null ? currency : "VND");
            invoice.setLinesJson(objectMapper.writeValueAsString(lines != null ? lines : Map.of()));
            return invoiceRepository.save(invoice);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not save checkout invoice", ex);
        }
    }

    @Transactional(readOnly = true)
    public BookingInvoiceDto getLatestInvoice(Long bookingId) {
        BookingInvoice invoice = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found for booking: " + bookingId));
        return toDto(invoice);
    }

    @Transactional(readOnly = true)
    public List<BookingInvoiceDto> listInvoices() {
        Map<Long, BookingInvoiceDto> resultByBooking = new LinkedHashMap<>();
        for (BookingInvoice invoice : invoiceRepository.findAllByOrderByCreatedAtDesc()) {
            resultByBooking.putIfAbsent(invoice.getBookingId(), toDto(invoice));
        }
        return new ArrayList<>(resultByBooking.values());
    }

    /**
     * Server-side search. All params are optional.
     * - invoiceCode: exact INV number (numeric part)
     * - bookingCode: partial or exact booking code to search in booking table
     * - customerName: partial name matched against guest names in booking
     * - date: shorthand for fromDate=toDate (single day)
     * - fromDate / toDate: invoice createdAt range (inclusive)
     * - statuses: list of booking statuses to include
     * - page / size: pagination
     */
    @Transactional(readOnly = true)
    public Page<BookingInvoiceDto> searchInvoices(
            String invoiceCode,
            String bookingCode,
            String customerName,
            LocalDate date,
            LocalDate fromDate,
            LocalDate toDate,
            List<String> statuses,
            int page,
            int size) {

        // Resolve date range
        LocalDate effectiveFrom = date != null ? date : fromDate;
        LocalDate effectiveTo = date != null ? date : toDate;
        LocalDateTime fromDt = effectiveFrom != null ? effectiveFrom.atStartOfDay() : null;
        LocalDateTime toDt = effectiveTo != null ? effectiveTo.atTime(23, 59, 59) : null;

        // Resolve booking IDs from bookingCode or customerName filter (joined through
        // Booking/Guest tables)
        List<Long> filteredBookingIds = null;
        if ((bookingCode != null && !bookingCode.isBlank()) || (customerName != null && !customerName.isBlank())) {
            List<iuh.fit.hotelsystem_booking.entity.Booking> matchingBookings = bookingRepository
                    .findAllByOrderByCreatedAtDesc();
            filteredBookingIds = matchingBookings.stream()
                    .filter(b -> {
                        boolean matchCode = bookingCode == null || bookingCode.isBlank()
                                || (b.getBookingCode() != null && b.getBookingCode().toLowerCase()
                                        .contains(bookingCode.trim().toLowerCase()));
                        boolean matchName = customerName == null || customerName.isBlank();
                        if (!matchName) {
                            // Check guest names for this booking
                            try {
                                List<iuh.fit.hotelsystem_booking.entity.BookingGuest> guests = bookingGuestService
                                        .getGuests(b.getId());
                                matchName = guests.stream().anyMatch(g -> g.getFullName() != null &&
                                        g.getFullName().toLowerCase().contains(customerName.trim().toLowerCase()));
                            } catch (Exception ignored) {
                                matchName = false;
                            }
                        }
                        return matchCode && matchName;
                    })
                    .map(iuh.fit.hotelsystem_booking.entity.Booking::getId)
                    .collect(Collectors.toList());
            if (filteredBookingIds.isEmpty()) {
                return Page.empty(PageRequest.of(page, size));
            }
        }

        // Resolve normalised invoiceCode (strip "INV-" prefix if present)
        String normalizedInvoiceCode = null;
        if (invoiceCode != null && !invoiceCode.isBlank()) {
            normalizedInvoiceCode = invoiceCode.trim().replaceAll("(?i)^inv-", "");
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        final String finalNormalizedInvoiceCode = normalizedInvoiceCode;
        final List<Long> finalFilteredBookingIds = filteredBookingIds;
        final LocalDateTime finalFromDt = fromDt;
        final LocalDateTime finalToDt = toDt;

        org.springframework.data.jpa.domain.Specification<BookingInvoice> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();

            if (finalNormalizedInvoiceCode != null) {
                try {
                    Long id = Long.parseLong(finalNormalizedInvoiceCode);
                    predicates.add(cb.equal(root.get("id"), id));
                } catch (NumberFormatException e) {
                    // ignore invalid invoice id
                }
            }

            if (finalFromDt != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), finalFromDt));
            }

            if (finalToDt != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), finalToDt));
            }

            if (finalFilteredBookingIds != null && !finalFilteredBookingIds.isEmpty()) {
                predicates.add(root.get("bookingId").in(finalFilteredBookingIds));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        Page<BookingInvoice> invoicePage = invoiceRepository.findAll(spec, pageable);

        // Convert to DTO, then apply status filter (post-enrich since status comes from
        // Booking)
        List<BookingInvoiceDto> dtos = invoicePage.getContent().stream()
                .map(this::toDto)
                .filter(dto -> {
                    if (statuses == null || statuses.isEmpty() || statuses.contains("ALL"))
                        return true;
                    String s = dto.getBookingStatus();
                    return s != null && statuses.contains(s);
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, invoicePage.getTotalElements());
    }

    private BookingInvoiceDto toDto(BookingInvoice invoice) {
        BookingInvoiceDto dto = new BookingInvoiceDto();
        dto.setId(invoice.getId());
        dto.setBookingId(invoice.getBookingId());
        dto.setAmount(invoice.getAmount());
        dto.setCurrency(invoice.getCurrency());
        dto.setCreatedAt(invoice.getCreatedAt());
        try {
            dto.setLines(objectMapper.readValue(invoice.getLinesJson(), Object.class));
        } catch (Exception ex) {
            dto.setLines(invoice.getLinesJson());
        }
        enrich(dto);
        return dto;
    }

    private void enrich(BookingInvoiceDto dto) {
        if (dto == null || dto.getBookingId() == null) {
            return;
        }
        Optional<Booking> bookingOpt = bookingRepository.findByIdWithItems(dto.getBookingId());
        if (bookingOpt.isEmpty()) {
            return;
        }

        Booking booking = bookingOpt.get();
        dto.setBookingCode(booking.getBookingCode());
        dto.setBookingStatus(booking.getStatus() != null ? booking.getStatus().name() : null);
        dto.setCustomerUserId(booking.getUserId() != null ? String.valueOf(booking.getUserId()) : null);
        dto.setCheckInDate(booking.getCheckIn() != null ? booking.getCheckIn().toString() : null);
        dto.setCheckOutDate(booking.getCheckOut() != null ? booking.getCheckOut().toString() : null);
        dto.setTotalRooms(booking.getTotalRooms() != null ? booking.getTotalRooms()
                : (booking.getItems() != null ? booking.getItems().size() : null));
        applyBookingRoomStaff(dto, booking);

        List<BookingGuest> guests = bookingGuestService.getGuests(dto.getBookingId());
        BookingGuest representative = pickRepresentativeGuest(guests);
        if (representative != null) {
            dto.setCustomerName(representative.getFullName());
            dto.setRepresentativeName(representative.getFullName());
            dto.setRepresentativePhone(representative.getPhone());
            dto.setRepresentativeCccd(representative.getCccd());
        } else if (!guests.isEmpty()) {
            BookingGuest first = guests.get(0);
            dto.setCustomerName(first.getFullName());
            dto.setRepresentativeName(first.getFullName());
            dto.setRepresentativePhone(first.getPhone());
            dto.setRepresentativeCccd(first.getCccd());
        }

        bookingStayRepository.findByBookingId(dto.getBookingId()).ifPresent(stay -> applyStay(dto, stay));
        applyInvoiceStaff(dto);

        RefundTransaction refund = refundTransactionRepository
                .findFirstByBookingIdAndReasonOrderByCreatedAtDesc(dto.getBookingId(), "EARLY_CHECKOUT_REFUND")
                .orElseGet(() -> refundTransactionRepository.findFirstByBookingId(dto.getBookingId()).orElse(null));
        if (refund != null) {
            dto.setRefundTransactionId(refund.getId());
            dto.setRefundStatus(refund.getStatus() != null ? refund.getStatus().name() : null);
            dto.setRefundSettlementAmount(
                    refund.getRefundAmount() != null ? BigDecimal.valueOf(refund.getRefundAmount()) : null);
        }
    }

    private void applyBookingRoomStaff(BookingInvoiceDto dto, Booking booking) {
        if (booking == null || booking.getItems() == null || booking.getItems().isEmpty()) {
            return;
        }
        java.util.Set<Long> checkinStaffIds = new java.util.LinkedHashSet<>();
        java.util.Set<Long> checkoutStaffIds = new java.util.LinkedHashSet<>();
        LocalDateTime firstCheckinAt = null;
        LocalDateTime lastCheckoutAt = null;
        for (var item : booking.getItems()) {
            if (item.getCheckedInByStaffId() != null) {
                checkinStaffIds.add(item.getCheckedInByStaffId());
            }
            if (item.getCheckedOutByStaffId() != null) {
                checkoutStaffIds.add(item.getCheckedOutByStaffId());
            }
            if (item.getActualCheckInAt() != null
                    && (firstCheckinAt == null || item.getActualCheckInAt().isBefore(firstCheckinAt))) {
                firstCheckinAt = item.getActualCheckInAt();
            }
            if (item.getActualCheckOutAt() != null
                    && (lastCheckoutAt == null || item.getActualCheckOutAt().isAfter(lastCheckoutAt))) {
                lastCheckoutAt = item.getActualCheckOutAt();
            }
        }
        if (!checkinStaffIds.isEmpty()) {
            dto.setCheckinStaffId(
                    checkinStaffIds.size() == 1 ? String.valueOf(checkinStaffIds.iterator().next()) : "MULTIPLE");
        }
        if (!checkoutStaffIds.isEmpty()) {
            dto.setCheckoutStaffId(
                    checkoutStaffIds.size() == 1 ? String.valueOf(checkoutStaffIds.iterator().next()) : "MULTIPLE");
        }
        if (firstCheckinAt != null) {
            dto.setCheckedInAt(firstCheckinAt);
        }
        if (lastCheckoutAt != null) {
            dto.setCheckedOutAt(lastCheckoutAt);
        }
    }

    @SuppressWarnings("unchecked")
    private void applyInvoiceStaff(BookingInvoiceDto dto) {
        if (!(dto.getLines() instanceof Map<?, ?> lines)) {
            return;
        }
        Object createdByStaffId = lines.get("createdByStaffId");
        if ((dto.getCheckoutStaffId() == null || dto.getCheckoutStaffId().isBlank()) && createdByStaffId != null) {
            dto.setCheckoutStaffId(String.valueOf(createdByStaffId));
        }
    }

    private void applyStay(BookingInvoiceDto dto, BookingStay stay) {
        if ((dto.getCheckinStaffId() == null || dto.getCheckinStaffId().isBlank())
                && stay.getCheckedInByStaffId() != null) {
            dto.setCheckinStaffId(String.valueOf(stay.getCheckedInByStaffId()));
        }
        if ((dto.getCheckoutStaffId() == null || dto.getCheckoutStaffId().isBlank())
                && stay.getCheckedOutByStaffId() != null) {
            dto.setCheckoutStaffId(String.valueOf(stay.getCheckedOutByStaffId()));
        }
        if (dto.getCheckedInAt() == null) {
            dto.setCheckedInAt(stay.getActualCheckInAt());
        }
        if (dto.getCheckedOutAt() == null) {
            dto.setCheckedOutAt(stay.getActualCheckOutAt());
        }
        if (dto.getRepresentativeName() == null || dto.getRepresentativeName().isBlank()) {
            dto.setRepresentativeName(stay.getRepresentativeFullName());
            dto.setRepresentativePhone(stay.getRepresentativePhone());
            dto.setRepresentativeCccd(stay.getRepresentativeCccd());
            dto.setCustomerName(stay.getRepresentativeFullName());
        }
    }

    private BookingGuest pickRepresentativeGuest(List<BookingGuest> guests) {
        BookingGuest primary = null;
        BookingGuest first = null;
        for (BookingGuest guest : guests) {
            if (guest == null)
                continue;
            if (first == null)
                first = guest;
            if (Boolean.TRUE.equals(guest.getCheckInPerson())) {
                return guest;
            }
            if (primary == null && Boolean.TRUE.equals(guest.getPrimaryGuest())) {
                primary = guest;
            }
        }
        return primary != null ? primary : first;
    }
}
