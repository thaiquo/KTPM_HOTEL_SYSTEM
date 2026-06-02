package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.client.PaymentServiceClient;
import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.client.UserServiceClient;
import iuh.fit.hotelsystem_booking.dto.PaymentTransactionDto;
import iuh.fit.hotelsystem_booking.dto.invoice.*;
import iuh.fit.hotelsystem_booking.dto.Room;
import iuh.fit.hotelsystem_booking.dto.UserProfileDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.criteria.Predicate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewInvoiceService {

    private final BookingInvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingGuestRepository guestRepository;
    private final RefundTransactionRepository refundRepository;
    private final PaymentServiceClient paymentServiceClient;
    private final UserServiceClient userServiceClient;
    private final RoomServiceClient roomServiceClient;
    private final InvoiceStatusResolver invoiceStatusResolver;
    private final ObjectMapper objectMapper;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional(readOnly = true)
    public InvoiceSearchResponseDto searchInvoices(
            String invoiceCode, String bookingCode, String customerName, String customerPhone,
            LocalDate specificDate, LocalDate fromDate, LocalDate toDate,
            List<String> invoiceStatuses, String paymentStatus,
            int page, int size) {
        invoiceStatuses = normalizeStatusFilters(invoiceStatuses);

        // 1. Resolve date range
        LocalDate effectiveFrom = specificDate != null ? specificDate : fromDate;
        LocalDate effectiveTo = specificDate != null ? specificDate : toDate;
        LocalDateTime fromDt = effectiveFrom != null ? effectiveFrom.atStartOfDay() : null;
        LocalDateTime toDt = effectiveTo != null ? effectiveTo.atTime(23, 59, 59) : null;

        // 2. Pre-filter Booking IDs if bookingCode/customerName/customerPhone is provided
        List<Long> matchedBookingIds = null;
        if ((bookingCode != null && !bookingCode.isBlank()) || (customerName != null && !customerName.isBlank()) || (customerPhone != null && !customerPhone.isBlank())) {
            matchedBookingIds = filterBookingIdsByCodeAndName(bookingCode, customerName, customerPhone);
            if (matchedBookingIds.isEmpty()) {
                return emptySearchResponse(page, size);
            }
        }

        // 3. Normalized invoice code
        String finalInvoiceCode = (invoiceCode != null && !invoiceCode.isBlank()) ? invoiceCode.trim().replaceAll("(?i)^inv-", "") : null;

        // 4. Build Specification
        final List<Long> finalBookingIds = matchedBookingIds;
        final List<String> finalInvoiceStatuses = invoiceStatuses;
        final String finalPaymentStatus = paymentStatus;
        Specification<BookingInvoice> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (finalInvoiceCode != null) {
                try {
                    predicates.add(cb.equal(root.get("id"), Long.parseLong(finalInvoiceCode)));
                } catch (NumberFormatException e) {
                    predicates.add(cb.equal(root.get("id"), -1L)); // force empty
                }
            }
            if (fromDt != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDt));
            if (toDt != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDt));
            if (finalBookingIds != null && !finalBookingIds.isEmpty()) {
                predicates.add(root.get("bookingId").in(finalBookingIds));
            }

            if (finalInvoiceStatuses != null && !finalInvoiceStatuses.isEmpty() && !finalInvoiceStatuses.contains("ALL")) {
                List<Predicate> invoiceStatusPredicates = new ArrayList<>();
                invoiceStatusPredicates.add(root.get("invoiceStatus").in(finalInvoiceStatuses));
                if (finalInvoiceStatuses.contains("CANCELLED")) {
                    List<Long> cancelledBookingIds = bookingRepository.findByStatusOrderByCheckInDesc(BookingStatus.CANCELLED)
                            .stream()
                            .map(Booking::getId)
                            .filter(Objects::nonNull)
                            .collect(Collectors.toList());
                    if (!cancelledBookingIds.isEmpty()) {
                        invoiceStatusPredicates.add(root.get("bookingId").in(cancelledBookingIds));
                    }
                }
                if (finalInvoiceStatuses.contains("DRAFT")) {
                    invoiceStatusPredicates.add(cb.or(
                            cb.isNull(root.get("totalAllocatedPaidAmount")),
                            cb.equal(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO)
                    ));
                }
                if (finalInvoiceStatuses.contains("PARTIAL")) {
                    invoiceStatusPredicates.add(cb.and(
                            cb.gt(cb.coalesce(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                            cb.gt(cb.coalesce(root.get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO)
                    ));
                }
                if (finalInvoiceStatuses.contains("COMPLETED")) {
                    invoiceStatusPredicates.add(cb.and(
                            cb.gt(cb.coalesce(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                            cb.or(
                                    cb.equal(cb.coalesce(root.get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO),
                                    cb.isNull(root.get("remainingBalance"))
                            ),
                            cb.equal(cb.coalesce(root.get("totalRefundToCustomer"), BigDecimal.ZERO), BigDecimal.ZERO)
                    ));
                }
                if (!invoiceStatusPredicates.isEmpty()) {
                    predicates.add(cb.or(invoiceStatusPredicates.toArray(new Predicate[0])));
                }
            }

            if (finalPaymentStatus != null && !finalPaymentStatus.isBlank() && !"ALL".equalsIgnoreCase(finalPaymentStatus)) {
                String normalized = finalPaymentStatus.trim().toUpperCase(Locale.ROOT);
                switch (normalized) {
                    case "UNPAID" -> predicates.add(cb.or(
                            cb.isNull(root.get("totalAllocatedPaidAmount")),
                            cb.equal(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO)
                    ));
                    case "PARTIALLY_PAID" -> predicates.add(cb.and(
                            cb.gt(cb.coalesce(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                            cb.gt(cb.coalesce(root.get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO)
                    ));
                    case "PAID" -> predicates.add(cb.and(
                            cb.gt(cb.coalesce(root.get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                            cb.or(
                                    cb.equal(cb.coalesce(root.get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO),
                                    cb.isNull(root.get("remainingBalance"))
                            ),
                            cb.equal(cb.coalesce(root.get("totalRefundToCustomer"), BigDecimal.ZERO), BigDecimal.ZERO)
                    ));
                    case "REFUNDED" -> predicates.add(cb.gt(cb.coalesce(root.get("totalRefundToCustomer"), BigDecimal.ZERO), BigDecimal.ZERO));
                    default -> {
                    }
                }
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // 5. Use pageable query for listing and an aggregate query for summary (avoid loading full table)
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<BookingInvoice> invoicePage = invoiceRepository.findAll(spec, pageable);

        // batch fetch related bookings/guests for the page content to avoid N+1
        List<BookingInvoice> matchedInvoices = invoiceRepository.findAll(spec);
        Set<Long> invoiceBookingIds = matchedInvoices.stream().map(BookingInvoice::getBookingId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, Booking> bookingMap = loadBookingMapWithItems(invoiceBookingIds);
        Set<Long> bookingIdsInPage = invoicePage.getContent().stream().map(BookingInvoice::getBookingId).collect(Collectors.toSet());
        Map<Long, BookingGuest> guestMap = loadPrimaryGuestMap(bookingIdsInPage);

        List<InvoiceListDto> content = invoicePage.getContent().stream()
                .map(inv -> mapToListDto(inv, bookingMap.get(inv.getBookingId()), guestMap.get(inv.getBookingId())))
                .collect(Collectors.toList());

        InvoiceSummaryDto summary = buildSummary(matchedInvoices, bookingMap);

        InvoiceSearchResponseDto response = new InvoiceSearchResponseDto();
        response.setContent(content);
        response.setPage(invoicePage.getNumber());
        response.setSize(invoicePage.getSize());
        response.setTotalElements((int) invoicePage.getTotalElements());
        response.setTotalPages(invoicePage.getTotalPages());
        response.setSummary(summary);
        response.setInvoiceStatus(invoiceStatuses != null && !invoiceStatuses.isEmpty() ? String.join(",", invoiceStatuses) : null);
        response.setPaymentStatus(paymentStatus);
        return response;
    }

    private InvoiceListDto mapToListDto(BookingInvoice inv, Booking b, BookingGuest g) {
        InvoiceListDto dto = new InvoiceListDto();
        dto.setId(inv.getId());
        dto.setInvoiceCode("INV-" + String.format("%06d", inv.getId()));
        dto.setBookingId(inv.getBookingId());
        dto.setCreatedAt(inv.getCreatedAt());
        
        if (b != null) {
            dto.setBookingCode(b.getBookingCode());
        }
        
        if (g != null) {
            dto.setCustomerName(g.getFullName());
            dto.setCustomerPhone(g.getPhone());
        }

        InvoiceFinancials financials = readFinancials(inv, b);

        try {
            Map<String, Object> linesMap = objectMapper.readValue(inv.getLinesJson(), new TypeReference<>() {});

            // Build room numbers string
            List<Map<String,Object>> roomSummaries = (List<Map<String,Object>>) linesMap.get("roomSummaries");
            if (roomSummaries != null) {
                String rooms = roomSummaries.stream()
                    .map(rs -> String.valueOf(rs.get("roomNumber")))
                    .filter(s -> !"null".equals(s))
                    .collect(Collectors.joining(", "));
                dto.setRoomNumbers(rooms);
            }
        } catch (Exception e) {
        }

        dto.setGrossInvoiceAmount(financials.grossOriginal);
        dto.setTotalRefundAmount(financials.refundToCustomer);
        dto.setNetRevenue(financials.netRevenue);
        dto.setPaidAmount(financials.paid);
        dto.setRemainingAmount(financials.remainingToPay);
        dto.setInvoiceStatus(resolveInvoiceStatus(inv, b));
        dto.setStatus(b != null && b.getStatus() != null ? b.getStatus().name() : null);
        dto.setPaymentStatus(resolvePaymentStatus(inv, financials));

        return dto;
    }

    private Map<Long, BookingGuest> loadPrimaryGuestMap(Set<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<BookingGuest> guests = guestRepository.findByBookingIdIn(new ArrayList<>(bookingIds));
        if (guests == null || guests.isEmpty()) return Collections.emptyMap();
        Map<Long, BookingGuest> result = new HashMap<>();
        for (BookingGuest guest : guests) {
            if (guest == null || guest.getBookingId() == null) continue;
            Long bid = guest.getBookingId();
            BookingGuest current = result.get(bid);
            if (current == null) {
                result.put(bid, guest);
                continue;
            }
            // Prefer an explicit primary guest flag
            boolean curPrimary = Boolean.TRUE.equals(current.getPrimaryGuest());
            boolean thisPrimary = Boolean.TRUE.equals(guest.getPrimaryGuest());
            if (thisPrimary && !curPrimary) {
                result.put(bid, guest);
            }
        }
        return result;
    }

    private Map<Long, Booking> loadBookingMapWithItems(Set<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return bookingRepository.findAllByIdWithItems(new ArrayList<>(bookingIds)).stream()
                .filter(booking -> booking != null && booking.getId() != null)
                .collect(Collectors.toMap(Booking::getId, booking -> booking, (left, right) -> left));
    }

    private List<BookingGuest> loadGuestsForBooking(Long bookingId) {
        if (bookingId == null) {
            return Collections.emptyList();
        }
        return guestRepository.findByBookingIdOrderByPrimaryGuestDescIdAsc(bookingId);
    }

    private BigDecimal getBd(Map<String, Object> map, String key, BigDecimal defaultVal) {
        if (map == null || !map.containsKey(key)) return defaultVal;
        Object v = map.get(key);
        if (v == null) return defaultVal;
        try {
            return new BigDecimal(String.valueOf(v));
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private List<String> normalizeStatusFilters(List<String> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return statuses;
        }
        return statuses.stream()
                .filter(Objects::nonNull)
                .flatMap(status -> Arrays.stream(status.split(",")))
                .map(String::trim)
                .filter(status -> !status.isBlank())
                .map(status -> {
                    String normalized = status.toUpperCase(Locale.ROOT);
                    if ("PARTIAL_CHECKOUT".equals(normalized) || "PARTIALLY_CHECKED_OUT".equals(normalized)) {
                        return "PARTIAL";
                    }
                    if ("CHECKED_OUT".equals(normalized)) {
                        return "COMPLETED";
                    }
                    return normalized;
                })
                .distinct()
                .collect(Collectors.toList());
    }

    private InvoiceFinancials readFinancials(BookingInvoice inv) {
        InvoiceFinancials f = new InvoiceFinancials();
        f.grossOriginal = safe(inv != null ? inv.getTotalOriginalAmount() : null);
        f.paid = safe(inv != null ? inv.getTotalAllocatedPaidAmount() : null);
        f.actualRoomRevenue = safe(inv != null ? inv.getTotalActualRevenue() : null);
        f.earlyCheckoutRefund = safe(inv != null ? inv.getTotalEarlyCheckoutRefund() : null);
        f.additionalCharge = safe(inv != null ? inv.getTotalAdditionalCharge() : null);
        f.refundToCustomer = safe(inv != null ? inv.getTotalRefundToCustomer() : null);
        f.remainingToPay = safe(inv != null ? inv.getRemainingBalance() : null).max(BigDecimal.ZERO);
        f.netRevenue = safe(inv != null ? inv.getAmount() : null);

        try {
            Map<String, Object> m = objectMapper.readValue(inv.getLinesJson(), new TypeReference<>() {});
            f.grossOriginal = firstNonZero(f.grossOriginal, getBd(m, "totalOriginalAmount", BigDecimal.ZERO), getBd(m, "roomCharge", BigDecimal.ZERO));
            f.actualRoomRevenue = firstNonZero(f.actualRoomRevenue, getBd(m, "actualRoomCharge", BigDecimal.ZERO), getBd(m, "totalActualRevenue", BigDecimal.ZERO));
            f.serviceTotal = getBd(m, "serviceTotal", BigDecimal.ZERO)
                    .add(getBd(m, "roomServiceFeeTotal", getBd(m, "manualServiceTotal", BigDecimal.ZERO)));
            f.damageTotal = getBd(m, "damageFeeTotal", BigDecimal.ZERO);
            f.additionalCharge = firstNonZero(f.additionalCharge,
                    getBd(m, "totalAdditionalCharge", BigDecimal.ZERO),
                    getBd(m, "manualSurchargeTotal", BigDecimal.ZERO).add(getBd(m, "lateCheckoutFeeTotal", BigDecimal.ZERO)));
            f.earlyCheckoutRefund = firstNonZero(f.earlyCheckoutRefund,
                    getBd(m, "totalEarlyCheckoutRefund", BigDecimal.ZERO),
                    getBd(m, "earlyCheckoutRefund", BigDecimal.ZERO));
            f.refundToCustomer = firstNonZero(f.refundToCustomer,
                    getBd(m, "totalRefundToCustomer", BigDecimal.ZERO),
                    getBd(m, "refundSettlementAmount", BigDecimal.ZERO));
            f.paid = firstNonZero(f.paid,
                    getBd(m, "totalAllocatedPaidAmount", BigDecimal.ZERO),
                    getBd(m, "amountPaid", BigDecimal.ZERO));
            f.netRevenue = firstNonZero(f.netRevenue,
                    getBd(m, "grandTotal", BigDecimal.ZERO),
                    f.actualRoomRevenue.add(f.serviceTotal).add(f.damageTotal).add(f.additionalCharge));
            f.remainingToPay = getBd(m, "remainingBalance", f.netRevenue.subtract(f.paid)).max(BigDecimal.ZERO);
        } catch (Exception ignored) {
        }
        if (f.netRevenue.compareTo(BigDecimal.ZERO) == 0) {
            f.netRevenue = f.grossOriginal.subtract(f.earlyCheckoutRefund).add(f.serviceTotal).add(f.damageTotal).add(f.additionalCharge).max(BigDecimal.ZERO);
        }
        return f;
    }

    private InvoiceFinancials readFinancials(BookingInvoice inv, Booking booking) {
        InvoiceFinancials f = readFinancials(inv);
        if (booking == null || booking.getItems() == null || booking.getItems().isEmpty()) {
            return f;
        }

        BigDecimal bookingGross = booking.getItems().stream()
                .filter(item -> item != null && item.getStatus() != BookingItemStatus.CANCELLED)
                .map(this::calculateRoomOriginalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (bookingGross.compareTo(BigDecimal.ZERO) > 0) {
            f.grossOriginal = bookingGross;
        }

        RefundAmounts refunds = readRefundAmounts(booking.getId());
        BigDecimal transactionRefund = refunds.completed.add(refunds.pending);
        BigDecimal effectiveRefund = transactionRefund.compareTo(BigDecimal.ZERO) > 0
                ? transactionRefund
                : firstNonZero(f.refundToCustomer, f.earlyCheckoutRefund);
        f.refundToCustomer = effectiveRefund;
        f.earlyCheckoutRefund = effectiveRefund;

        if (booking.getPaidAmount() != null) {
            f.paid = f.paid.max(BigDecimal.valueOf(booking.getPaidAmount()));
        }

        f.netRevenue = f.grossOriginal
                .subtract(effectiveRefund)
                .add(f.serviceTotal)
                .add(f.damageTotal)
                .add(f.additionalCharge)
                .max(BigDecimal.ZERO);
        f.actualRoomRevenue = f.grossOriginal.subtract(effectiveRefund).max(BigDecimal.ZERO);
        f.remainingToPay = f.netRevenue.subtract(f.paid).max(BigDecimal.ZERO);
        return f;
    }

    private BigDecimal firstNonZero(BigDecimal... values) {
        if (values == null) {
            return BigDecimal.ZERO;
        }
        for (BigDecimal value : values) {
            if (value != null && value.compareTo(BigDecimal.ZERO) != 0) {
                return value;
            }
        }
        return values.length > 0 && values[0] != null ? values[0] : BigDecimal.ZERO;
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private InvoiceSummaryDto buildSummary(List<BookingInvoice> invoices, Map<Long, Booking> pageBookingMap) {
        InvoiceSummaryDto summary = new InvoiceSummaryDto();
        if (invoices == null || invoices.isEmpty()) {
            return summary;
        }
        summary.setTotalInvoices(invoices.size());
        for (BookingInvoice inv : invoices) {
            Booking booking = pageBookingMap != null ? pageBookingMap.get(inv.getBookingId()) : null;
            InvoiceFinancials f = readFinancials(inv, booking);
            summary.setGrossInvoiceAmount(summary.getGrossInvoiceAmount().add(f.grossOriginal));
            summary.setTotalPaidAmount(summary.getTotalPaidAmount().add(f.paid));
            summary.setTotalActualRevenue(summary.getTotalActualRevenue().add(f.netRevenue));
            summary.setNetRevenue(summary.getNetRevenue().add(f.netRevenue));
            summary.setTotalEarlyCheckoutRefund(summary.getTotalEarlyCheckoutRefund().add(f.earlyCheckoutRefund));
            summary.setTotalRefundAmount(summary.getTotalRefundAmount().add(f.refundToCustomer));
            summary.setTotalAdditionalCharge(summary.getTotalAdditionalCharge().add(f.additionalCharge.add(f.damageTotal)));
            summary.setTotalRemainingAmount(summary.getTotalRemainingAmount().add(f.remainingToPay));
            summary.setTotalRemainingToPay(summary.getTotalRemainingToPay().add(f.remainingToPay));

            RefundAmounts refunds = readRefundAmounts(inv.getBookingId());
            summary.setTotalRefundedAmount(summary.getTotalRefundedAmount().add(refunds.completed));
            summary.setTotalPendingRefundAmount(summary.getTotalPendingRefundAmount().add(refunds.pending));
            if (refunds.completed.compareTo(BigDecimal.ZERO) > 0) {
                summary.setRefundedInvoiceCount(summary.getRefundedInvoiceCount() + 1);
            }
            String invoiceStatus = resolveInvoiceStatus(inv, booking);
            if ("COMPLETED".equals(invoiceStatus)) {
                summary.setPaidInvoiceCount(summary.getPaidInvoiceCount() + 1);
                summary.setCompletedInvoiceCount(summary.getCompletedInvoiceCount() + 1);
            } else if ("PARTIAL".equals(invoiceStatus)) {
                summary.setPartiallyPaidInvoiceCount(summary.getPartiallyPaidInvoiceCount() + 1);
                summary.setPartialInvoiceCount(summary.getPartialInvoiceCount() + 1);
            } else if ("DRAFT".equals(invoiceStatus)) {
                summary.setUnpaidInvoiceCount(summary.getUnpaidInvoiceCount() + 1);
            }
        }
        return summary;
    }

    private RefundAmounts readRefundAmounts(Long bookingId) {
        RefundAmounts amounts = new RefundAmounts();
        if (bookingId == null) {
            return amounts;
        }
        for (RefundTransaction refund : refundRepository.findByBookingIdOrderByCreatedAtDesc(bookingId)) {
            BigDecimal amount = refund.getAmount() != null ? BigDecimal.valueOf(refund.getAmount()) : BigDecimal.ZERO;
            if (refund.getStatus() == null) {
                continue;
            }
            switch (refund.getStatus()) {
                case COMPLETED, REFUNDED, SUCCESS -> amounts.completed = amounts.completed.add(amount);
                case PENDING, ASSIGNED, PROCESSING, APPROVED -> amounts.pending = amounts.pending.add(amount);
                default -> {
                }
            }
        }
        return amounts;
    }

    private static class InvoiceFinancials {
        private BigDecimal grossOriginal = BigDecimal.ZERO;
        private BigDecimal paid = BigDecimal.ZERO;
        private BigDecimal actualRoomRevenue = BigDecimal.ZERO;
        private BigDecimal serviceTotal = BigDecimal.ZERO;
        private BigDecimal damageTotal = BigDecimal.ZERO;
        private BigDecimal additionalCharge = BigDecimal.ZERO;
        private BigDecimal earlyCheckoutRefund = BigDecimal.ZERO;
        private BigDecimal refundToCustomer = BigDecimal.ZERO;
        private BigDecimal remainingToPay = BigDecimal.ZERO;
        private BigDecimal netRevenue = BigDecimal.ZERO;
    }

    private static class RefundAmounts {
        private BigDecimal completed = BigDecimal.ZERO;
        private BigDecimal pending = BigDecimal.ZERO;
    }

    private InvoiceSearchResponseDto emptySearchResponse(int page, int size) {
        InvoiceSearchResponseDto response = new InvoiceSearchResponseDto();
        response.setContent(Collections.emptyList());
        response.setPage(page);
        response.setSize(size);
        response.setTotalElements(0);
        response.setTotalPages(0);
        response.setSummary(new InvoiceSummaryDto());
        return response;
    }

    private List<Long> filterBookingIdsByCodeAndName(String bookingCode, String customerName, String customerPhone) {
        Set<Long> ids = new java.util.HashSet<>();

        boolean hasCode = bookingCode != null && !bookingCode.isBlank();
        boolean hasName = customerName != null && !customerName.isBlank();
        boolean hasPhone = customerPhone != null && !customerPhone.isBlank();

        if (!hasCode && !hasName && !hasPhone) return null;

        if (hasCode) {
            List<Booking> byCode = bookingRepository.findByBookingCodeContainingIgnoreCase(bookingCode.trim());
            for (Booking b : byCode) if (b != null && b.getId() != null) ids.add(b.getId());
        }

        if (hasName) {
            List<BookingGuest> guests = guestRepository.findByFullNameContainingIgnoreCase(customerName.trim());
            Set<Long> byGuest = guests.stream().map(BookingGuest::getBookingId).filter(Objects::nonNull).collect(Collectors.toSet());
            if (!hasCode) {
                ids.addAll(byGuest);
            } else {
                ids.retainAll(byGuest);
            }
        }

        if (hasPhone) {
            List<BookingGuest> guests = guestRepository.findByPhoneContaining(customerPhone.trim());
            Set<Long> byPhone = guests.stream().map(BookingGuest::getBookingId).filter(Objects::nonNull).collect(Collectors.toSet());
            if (!hasCode && !hasName) {
                ids.addAll(byPhone);
            } else {
                ids.retainAll(byPhone);
            }
        }

        return new ArrayList<>(ids);
    }

    private String resolveInvoiceStatus(BookingInvoice inv, Booking booking) {
        Booking effectiveBooking = booking;
        if (effectiveBooking == null && inv != null && inv.getBookingId() != null) {
            effectiveBooking = bookingRepository.findByIdWithItems(inv.getBookingId()).orElse(null);
        }
        if (effectiveBooking != null) {
            return invoiceStatusResolver.resolve(effectiveBooking);
        }
        if (inv != null && inv.getInvoiceStatus() != null && !inv.getInvoiceStatus().isBlank()) {
            return invoiceStatusResolver.normalize(inv.getInvoiceStatus());
        }
        return "DRAFT";
    }

    private String resolvePaymentStatus(BookingInvoice inv, InvoiceFinancials financials) {
        String invoiceStatus = resolveInvoiceStatus(inv, null);
        if ("PENDING_REFUND".equals(invoiceStatus) || "REFUNDED".equals(invoiceStatus)) {
            return invoiceStatus;
        }
        RefundAmounts refunds = readRefundAmounts(inv != null ? inv.getBookingId() : null);
        if (refunds.pending.compareTo(BigDecimal.ZERO) > 0) {
            return "PENDING_REFUND";
        }
        if (refunds.completed.compareTo(BigDecimal.ZERO) > 0) {
            return "REFUNDED";
        }
        if (financials.refundToCustomer.compareTo(BigDecimal.ZERO) > 0) {
            return "PENDING_REFUND";
        }
        if (inv != null && inv.getPaymentStatus() != null && !inv.getPaymentStatus().isBlank()) {
            return inv.getPaymentStatus();
        }
        if (financials.paid.compareTo(BigDecimal.ZERO) == 0) {
            return "UNPAID";
        }
        if (financials.remainingToPay.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY_PAID";
        }
        return "PAID";
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponseDto getInvoiceDetail(Long invoiceId) {
        BookingInvoice inv = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
            
        Booking b = bookingRepository.findByIdWithItems(inv.getBookingId())
                .orElseGet(() -> bookingRepository.findById(inv.getBookingId()).orElse(null));
        List<BookingGuest> guests = loadGuestsForBooking(inv.getBookingId());

        InvoiceDetailResponseDto dto = new InvoiceDetailResponseDto();
        dto.setId(inv.getId());
        dto.setInvoiceCode("INV-" + String.format("%06d", inv.getId()));
        dto.setBookingId(inv.getBookingId());
        if (b != null) dto.setBookingCode(b.getBookingCode());
        dto.setCreatedAt(inv.getCreatedAt());
        dto.setInvoiceStatus(resolveInvoiceStatus(inv, b));
        dto.setStatus(dto.getInvoiceStatus());
        dto.setBookingStatus(b != null && b.getStatus() != null ? b.getStatus().name() : null);
        InvoiceFinancials financials = readFinancials(inv);
        dto.setPaymentStatus(resolvePaymentStatus(inv, financials));

        if (!guests.isEmpty()) {
            BookingGuest primary = guests.get(0);
            InvoiceDetailResponseDto.CustomerInfo c = new InvoiceDetailResponseDto.CustomerInfo();
            c.setFullName(primary.getFullName());
            c.setPhone(primary.getPhone());
            c.setCccd(primary.getCccd() != null ? primary.getCccd() : primary.getPassport());
            dto.setCustomer(c);
        }

            BigDecimal paid = financials.paid;
        try {
            Map<String, Object> m = objectMapper.readValue(inv.getLinesJson(), new TypeReference<>() {});
            
            // Rooms breakdown
            List<InvoiceDetailResponseDto.RoomBreakdownDto> rDtoList = new ArrayList<>();
            List<Map<String,Object>> roomSummaries = (List<Map<String,Object>>) m.get("roomSummaries");
            if (roomSummaries != null) {
                for (Map<String,Object> rs : roomSummaries) {
                    InvoiceDetailResponseDto.RoomBreakdownDto r = new InvoiceDetailResponseDto.RoomBreakdownDto();
                    r.setBookingRoomId(toLong(rs.get("bookingRoomId")));
                    r.setRoomName("Phòng " + rs.get("roomNumber"));
                    r.setRoomCode(rs.get("roomNumber") != null ? String.valueOf(rs.get("roomNumber")) : null);
                    r.setRoomType(rs.get("roomTypeName") != null ? String.valueOf(rs.get("roomTypeName")) : (String) rs.get("roomType"));
                    r.setCheckInDate(toLocalDateTime(rs.get("checkInDate")));
                    r.setPlannedCheckoutDate(toLocalDateTime(rs.get("plannedCheckOutDate")));
                    r.setActualCheckoutDate(toLocalDateTime(rs.get("actualCheckOutAt")));
                    r.setOriginalAmount(getBd(rs, "roomOriginalAmount", getBd(rs, "roomCharge", BigDecimal.ZERO)));
                    r.setUsedAmount(getBd(rs, "usedRoomAmount", getBd(rs, "usedNightAmount", BigDecimal.ZERO)));
                    r.setUnusedAmount(getBd(rs, "unusedRoomAmount", getBd(rs, "unusedNightAmount", BigDecimal.ZERO)));
                    r.setEarlyCheckoutRefund(getBd(rs, "earlyCheckoutRefund", BigDecimal.ZERO));
                    r.setHotelKeepAmount(getBd(rs, "hotelKeepAmount", getBd(rs, "hotelPenaltyAmount", BigDecimal.ZERO)));
                    r.setNetRevenue(getBd(rs, "actualRoomRevenue", r.getOriginalAmount().subtract(r.getEarlyCheckoutRefund()).max(BigDecimal.ZERO)));
                    r.setAllocatedPaidAmount(getBd(rs, "allocatedPaidAmount", getBd(rs, "paidAllocated", BigDecimal.ZERO)));
                    r.setRoomStatus(rs.get("roomStatus") != null ? String.valueOf(rs.get("roomStatus")) : "CHECKED_OUT");
                    rDtoList.add(r);
                }
            }
            appendMissingBookingRooms(rDtoList, b, financials.paid);
            dto.setRooms(rDtoList);

            // Fetch generic invoice lines
            List<Map<String,Object>> invoiceLines = (List<Map<String,Object>>) m.get("invoiceItems");
            if (invoiceLines == null) {
                invoiceLines = (List<Map<String,Object>>) m.get("invoiceLines");
            }
            List<InvoiceDetailResponseDto.ServiceChargeDto> svcList = new ArrayList<>();
            List<InvoiceDetailResponseDto.DamageChargeDto> dmgList = new ArrayList<>();
            
            if (invoiceLines != null) {
                for (Map<String,Object> l : invoiceLines) {
                    String cat = String.valueOf(l.get("category"));
                    String itemName = String.valueOf(l.get("description"));
                    BigDecimal amt = getBd(l, "amount", BigDecimal.ZERO);
                    
                    if ("SERVICE".equalsIgnoreCase(cat)) {
                        InvoiceDetailResponseDto.ServiceChargeDto sv = new InvoiceDetailResponseDto.ServiceChargeDto();
                        sv.setCategory("Dịch vụ");
                        sv.setItemName(itemName);
                        sv.setAmount(amt);
                        Object quantityValue = l.get("quantity");
                        sv.setQuantity(quantityValue instanceof Number ? ((Number) quantityValue).intValue() : 1);
                        svcList.add(sv);
                    } else if ("DAMAGE".equalsIgnoreCase(cat) || "MANUAL".equalsIgnoreCase(cat)) {
                        InvoiceDetailResponseDto.DamageChargeDto dm = new InvoiceDetailResponseDto.DamageChargeDto();
                        dm.setItemName(itemName);
                        dm.setAmount(amt);
                        dmgList.add(dm);
                    }
                }
            }
            dto.setServiceCharges(svcList);
            dto.setDamageCharges(dmgList);
            dto.setInvoiceLines(ensureRoomInvoiceLines(rDtoList, invoiceLines, inv.getBookingId()));
            
            // Financials from Snapshot
            InvoiceDetailResponseDto.RevenueSummarySection rs = new InvoiceDetailResponseDto.RevenueSummarySection();
            BigDecimal totalActualRev = getBd(m, "totalActualRevenue", BigDecimal.ZERO);
            BigDecimal serviceTotal = getBd(m, "serviceTotal", BigDecimal.ZERO);
            BigDecimal roomServiceFeeTotal = getBd(m, "roomServiceFeeTotal", getBd(m, "manualServiceTotal", BigDecimal.ZERO));
            BigDecimal damageTotal = getBd(m, "damageFeeTotal", BigDecimal.ZERO);
            BigDecimal manualSurcharge = getBd(m, "manualSurchargeTotal", BigDecimal.ZERO);
            
            BigDecimal gross = getBd(m, "totalOriginalAmount", BigDecimal.ZERO);
            BigDecimal refundEarly = getBd(m, "totalEarlyCheckoutRefund", getBd(m, "earlyCheckoutRefund", BigDecimal.ZERO));
            // Prefer authoritative allocated paid amount stored in snapshot
            paid = getBd(m, "totalAllocatedPaidAmount", getBd(m, "amountPaid", inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO));
            
            rs.setTotalRoomAmount(financials.actualRoomRevenue);
            rs.setTotalServiceAmount(financials.serviceTotal);
            rs.setTotalDamageAmount(financials.damageTotal);
            rs.setGrossInvoiceAmount(financials.grossOriginal);
            rs.setTotalEarlyCheckoutRefundAmount(financials.earlyCheckoutRefund);
            rs.setTotalActualRevenue(financials.netRevenue);
            rs.setNetRevenue(financials.netRevenue);
            rs.setRefundToCustomer(financials.refundToCustomer);
            rs.setTotalPaidAmount(paid);
            rs.setTotalAllocatedPaidAmount(paid);
            rs.setRemainingAmount(financials.remainingToPay);
            rs.setAdditionalRefundAmount(getBd(m, "additionalRefundAmount", getBd(m, "refundSettlementAmount", financials.refundToCustomer)));
            rs.setAdditionalChargeAmount(financials.additionalCharge.add(financials.damageTotal));
            rs.setRemainingToPay(financials.remainingToPay);

            dto.setRevenueSummary(rs);

            // Try to read checkout staff / processedBy from snapshot JSON if available
            String checkoutStaff = null;
            Long checkoutStaffId = toLong(m.get("checkoutStaffId"));
            Long processedByStaffId = toLong(m.get("processedByStaffId"));
            if (checkoutStaffId != null) {
                String checkoutStaffName = resolveUserName(checkoutStaffId);
                dto.setCheckoutStaffId(String.valueOf(checkoutStaffId));
                dto.setCheckoutStaffName(checkoutStaffName);
                checkoutStaff = checkoutStaffName != null ? checkoutStaffName : String.valueOf(checkoutStaffId);
            }
            if (processedByStaffId != null) {
                String processedByName = resolveUserName(processedByStaffId);
                dto.setProcessedByStaffId(String.valueOf(processedByStaffId));
                dto.setProcessedByName(processedByName);
                dto.setProcessedBy(processedByName != null ? processedByName : String.valueOf(processedByStaffId));
            }
            if (m.containsKey("processedBy")) {
                checkoutStaff = String.valueOf(m.get("processedBy"));
                dto.setProcessedBy(checkoutStaff);
            } else if (m.containsKey("checkoutStaff")) {
                checkoutStaff = String.valueOf(m.get("checkoutStaff"));
            }
            if (checkoutStaff != null && !checkoutStaff.isBlank()) dto.setCheckoutStaff(checkoutStaff);
            
        } catch (Exception ignored) {
            log.error("Failed to parse invoice json", ignored);
        }
        if (dto.getRooms() == null) {
            List<InvoiceDetailResponseDto.RoomBreakdownDto> rooms = new ArrayList<>();
            appendMissingBookingRooms(rooms, b, financials.paid);
            dto.setRooms(rooms);
        }
        applyStaffFields(dto, b);

        List<InvoiceDetailResponseDto.PaymentRecord> pRecords = loadPaymentRecords(inv.getBookingId());
        InvoiceDetailResponseDto.PaymentHistorySection phs = new InvoiceDetailResponseDto.PaymentHistorySection();
        phs.setRecords(pRecords);
        dto.setPaymentHistory(phs);
        dto.setPaymentTransactions(pRecords);

        // Fetch Refunds and compute aggregates
        List<RefundTransaction> refData = refundRepository.findByBookingIdOrderByCreatedAtDesc(inv.getBookingId());
        List<InvoiceDetailResponseDto.RefundRecord> rRecords = new ArrayList<>();
        java.math.BigDecimal alreadyRefunded = java.math.BigDecimal.ZERO;
        java.math.BigDecimal pendingRefund = java.math.BigDecimal.ZERO;
        boolean hasAssigned = false;
        for (RefundTransaction r : refData) {
            InvoiceDetailResponseDto.RefundRecord rr = new InvoiceDetailResponseDto.RefundRecord();
            rr.setTime(r.getCreatedAt());
            java.math.BigDecimal amt = r.getAmount() != null ? java.math.BigDecimal.valueOf(r.getAmount()) : java.math.BigDecimal.ZERO;
            rr.setAmount(amt);
            rr.setReason(r.getReason());
            String refundStaffName = resolveUserName(r.getProcessedByStaffId());
            rr.setStaff(refundStaffName != null ? refundStaffName : (r.getProcessedBy() != null ? r.getProcessedBy() : "-"));
            rRecords.add(rr);

            if (dto.getProcessedByStaffId() == null && r.getProcessedByStaffId() != null) {
                dto.setProcessedByStaffId(String.valueOf(r.getProcessedByStaffId()));
                dto.setProcessedByName(refundStaffName);
                dto.setProcessedBy(refundStaffName != null ? refundStaffName : r.getProcessedBy());
            } else if (dto.getProcessedBy() == null && r.getProcessedBy() != null) {
                dto.setProcessedBy(r.getProcessedBy());
            }

            if (r.getStatus() != null) {
                switch (r.getStatus()) {
                    case COMPLETED, REFUNDED, SUCCESS -> alreadyRefunded = alreadyRefunded.add(amt);
                    case ASSIGNED -> { pendingRefund = pendingRefund.add(amt); hasAssigned = true; }
                    case PENDING, PROCESSING, APPROVED -> pendingRefund = pendingRefund.add(amt);
                    default -> pendingRefund = pendingRefund.add(java.math.BigDecimal.ZERO);
                }
            }
        }
        InvoiceDetailResponseDto.RefundHistorySection rhs = new InvoiceDetailResponseDto.RefundHistorySection();
        rhs.setRecords(rRecords);
        dto.setRefundHistory(rhs);

        // populate summary refund aggregates
        if (dto.getRevenueSummary() != null) {
            InvoiceDetailResponseDto.RevenueSummarySection rsSec = dto.getRevenueSummary();
            rsSec.setAlreadyRefundedAmount(alreadyRefunded);
            rsSec.setPendingRefundAmount(pendingRefund);
            // overall refund status for UI: NONE / PENDING / PARTIAL / COMPLETED
            String refundStatus = "NONE";
            if (alreadyRefunded.compareTo(java.math.BigDecimal.ZERO) > 0 && pendingRefund.compareTo(java.math.BigDecimal.ZERO) > 0) {
                refundStatus = "PARTIAL";
            } else if (pendingRefund.compareTo(java.math.BigDecimal.ZERO) > 0) {
                refundStatus = "PENDING";
            } else if (alreadyRefunded.compareTo(java.math.BigDecimal.ZERO) > 0) {
                refundStatus = "COMPLETED";
            }
            rsSec.setAdditionalRefundAmount(rsSec.getAdditionalRefundAmount() != null ? rsSec.getAdditionalRefundAmount() : java.math.BigDecimal.ZERO);
            rsSec.setAdditionalChargeAmount(rsSec.getAdditionalChargeAmount() != null ? rsSec.getAdditionalChargeAmount() : java.math.BigDecimal.ZERO);
            rsSec.setRemainingToPay(rsSec.getRemainingToPay() != null ? rsSec.getRemainingToPay() : rsSec.getRemainingAmount());
            recomputeDetailRevenueFromRooms(dto, rsSec, alreadyRefunded, pendingRefund, b);
            // set top-level fields
            dto.setRefundStatus(refundStatus);
        }

        return dto;
    }

    private List<InvoiceDetailResponseDto.PaymentRecord> loadPaymentRecords(Long bookingId) {
        if (bookingId == null || paymentServiceClient == null) {
            return Collections.emptyList();
        }
        try {
            List<PaymentTransactionDto> payments = paymentServiceClient.getPaymentsByBooking(bookingId);
            if (payments == null || payments.isEmpty()) {
                return Collections.emptyList();
            }
            return payments.stream()
                    .sorted((left, right) -> {
                        LocalDateTime leftTime = left.getPaidAt() != null ? left.getPaidAt() : left.getCreatedAt();
                        LocalDateTime rightTime = right.getPaidAt() != null ? right.getPaidAt() : right.getCreatedAt();
                        if (leftTime == null && rightTime == null) return 0;
                        if (leftTime == null) return 1;
                        if (rightTime == null) return -1;
                        return rightTime.compareTo(leftTime);
                    })
                    .map(this::toPaymentRecord)
                    .collect(Collectors.toList());
        } catch (Exception ex) {
            log.warn("Could not load payment history for bookingId={}: {}", bookingId, ex.getMessage());
            return Collections.emptyList();
        }
    }

    private InvoiceDetailResponseDto.PaymentRecord toPaymentRecord(PaymentTransactionDto payment) {
        InvoiceDetailResponseDto.PaymentRecord record = new InvoiceDetailResponseDto.PaymentRecord();
        record.setId(payment.getId());
        record.setTime(payment.getCreatedAt());
        record.setPaidAt(payment.getPaidAt());
        BigDecimal amount = BigDecimal.ZERO;
        if (payment.getPaidAmount() != null && payment.getPaidAmount() > 0) {
            amount = BigDecimal.valueOf(payment.getPaidAmount());
        } else if (payment.getAmount() != null) {
            amount = BigDecimal.valueOf(payment.getAmount());
        } else if (payment.getTotalAmount() != null) {
            amount = BigDecimal.valueOf(payment.getTotalAmount());
        }
        record.setAmount(amount);
        record.setMethod(payment.getMethod());
        record.setStatus(payment.getStatus());
        record.setPaymentType(payment.getPaymentType());
        record.setInvoiceCategory(payment.getInvoiceCategory());
        record.setTransactionId(payment.getTransactionId());
        record.setPaymentCode(payment.getPaymentCode());
        record.setVnpTransactionNo(payment.getVnpTransactionNo());
        record.setPayerName(payment.getPayerName());
        record.setPayerPhone(payment.getPayerPhone());
        return record;
    }

    private List<Map<String, Object>> ensureRoomInvoiceLines(
            List<InvoiceDetailResponseDto.RoomBreakdownDto> rooms,
            List<Map<String, Object>> existingLines,
            Long bookingId) {
        List<Map<String, Object>> lines = existingLines != null ? new ArrayList<>(existingLines) : new ArrayList<>();
        if (rooms == null || rooms.isEmpty()) {
            return lines;
        }

        Set<Long> roomsWithRoomLine = lines.stream()
                .filter(line -> line != null && "ROOM".equalsIgnoreCase(String.valueOf(line.get("category"))))
                .map(line -> toLong(line.get("bookingRoomId")))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, BigDecimal> refundByRoom = readEarlyCheckoutRefundByRoom(bookingId);
        for (InvoiceDetailResponseDto.RoomBreakdownDto room : rooms) {
            Long bookingRoomId = room.getBookingRoomId();
            if (bookingRoomId == null || roomsWithRoomLine.contains(bookingRoomId)) {
                continue;
            }
            BigDecimal original = safe(room.getOriginalAmount());
            BigDecimal roomRefund = refundByRoom.getOrDefault(bookingRoomId, safe(room.getEarlyCheckoutRefund()));
            BigDecimal net = original.subtract(roomRefund).max(BigDecimal.ZERO);
            lines.add(invoiceLine(room, "ROOM_CHARGE_USED", "ROOM", "Tiền phòng thực dùng", net));
            if (roomRefund.compareTo(BigDecimal.ZERO) > 0) {
                lines.add(invoiceLine(room, "EARLY_CHECKOUT_REFUND", "ADJUSTMENT", "Hoàn 80% đêm chưa dùng", roomRefund.negate()));
            }
        }
        return lines;
    }

    private Map<String, Object> invoiceLine(InvoiceDetailResponseDto.RoomBreakdownDto room,
                                            String itemType,
                                            String category,
                                            String description,
                                            BigDecimal amount) {
        Map<String, Object> line = new LinkedHashMap<>();
        line.put("bookingRoomId", room.getBookingRoomId());
        line.put("roomNumber", room.getRoomCode());
        line.put("roomTypeName", room.getRoomType());
        line.put("itemType", itemType);
        line.put("category", category);
        line.put("description", description);
        line.put("quantity", 1);
        line.put("unitPrice", amount);
        line.put("amount", amount);
        return line;
    }

    private Map<Long, BigDecimal> readEarlyCheckoutRefundByRoom(Long bookingId) {
        Map<Long, BigDecimal> out = new HashMap<>();
        if (bookingId == null) {
            return out;
        }
        for (RefundTransaction refund : refundRepository.findByBookingIdOrderByCreatedAtDesc(bookingId)) {
            if (refund == null || refund.getAmount() == null || refund.getIdempotencyKey() == null) {
                continue;
            }
            String key = refund.getIdempotencyKey();
            int marker = key.indexOf("_rooms_");
            if (marker < 0) {
                continue;
            }
            BigDecimal amount = BigDecimal.valueOf(refund.getAmount());
            String[] roomIds = key.substring(marker + "_rooms_".length()).split("-");
            List<Long> ids = Arrays.stream(roomIds)
                    .map(this::parseLongSafe)
                    .filter(Objects::nonNull)
                    .toList();
            if (ids.isEmpty()) {
                continue;
            }
            BigDecimal share = amount.divide(BigDecimal.valueOf(ids.size()), 0, java.math.RoundingMode.HALF_UP);
            for (Long roomId : ids) {
                out.merge(roomId, share, BigDecimal::add);
            }
        }
        return out;
    }

    private void recomputeDetailRevenueFromRooms(InvoiceDetailResponseDto dto,
                                                  InvoiceDetailResponseDto.RevenueSummarySection summary,
                                                  BigDecimal alreadyRefunded,
                                                  BigDecimal pendingRefund,
                                                  Booking booking) {
        if (dto == null || summary == null || dto.getRooms() == null || dto.getRooms().isEmpty()) {
            return;
        }
        Map<Long, BigDecimal> refundByRoom = readEarlyCheckoutRefundByRoom(dto.getBookingId());
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal roomNet = BigDecimal.ZERO;
        BigDecimal roomRefund = BigDecimal.ZERO;
        for (InvoiceDetailResponseDto.RoomBreakdownDto room : dto.getRooms()) {
            BigDecimal original = safe(room.getOriginalAmount());
            BigDecimal mappedRefund = refundByRoom.getOrDefault(room.getBookingRoomId(), safe(room.getEarlyCheckoutRefund()));
            BigDecimal net = original.subtract(mappedRefund).max(BigDecimal.ZERO);
            gross = gross.add(original);
            roomRefund = roomRefund.add(mappedRefund);
            roomNet = roomNet.add(net);
            room.setEarlyCheckoutRefund(mappedRefund);
            room.setNetRevenue(net);
        }
        BigDecimal totalRefundTransactions = safe(alreadyRefunded).add(safe(pendingRefund));
        BigDecimal effectiveRefund = totalRefundTransactions.compareTo(BigDecimal.ZERO) > 0
                ? totalRefundTransactions
                : roomRefund;
        BigDecimal netRevenue = gross
                .subtract(effectiveRefund)
                .add(safe(summary.getTotalServiceAmount()))
                .add(safe(summary.getTotalDamageAmount()))
                .add(safe(summary.getAdditionalChargeAmount()))
                .max(BigDecimal.ZERO);
        BigDecimal paid = safe(summary.getTotalPaidAmount());
        if (booking != null && booking.getPaidAmount() != null) {
            paid = paid.max(BigDecimal.valueOf(booking.getPaidAmount()));
        }
        if (paid.compareTo(BigDecimal.ZERO) == 0) {
            paid = gross;
        }
        summary.setGrossInvoiceAmount(gross);
        summary.setTotalRoomAmount(roomNet);
        summary.setTotalEarlyCheckoutRefundAmount(effectiveRefund);
        summary.setRefundToCustomer(effectiveRefund);
        summary.setAdditionalRefundAmount(effectiveRefund);
        summary.setTotalActualRevenue(netRevenue);
        summary.setNetRevenue(netRevenue);
        summary.setTotalPaidAmount(paid);
        summary.setTotalAllocatedPaidAmount(paid);
        summary.setRemainingAmount(netRevenue.subtract(paid).max(BigDecimal.ZERO));
        summary.setRemainingToPay(summary.getRemainingAmount());
    }

    private Long parseLongSafe(String value) {
        try {
            return value == null || value.isBlank() ? null : Long.parseLong(value.trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private void appendMissingBookingRooms(List<InvoiceDetailResponseDto.RoomBreakdownDto> rooms,
                                           Booking booking,
                                           BigDecimal totalPaid) {
        if (rooms == null || booking == null || booking.getItems() == null) {
            return;
        }
        Set<String> existingRoomCodes = rooms.stream()
                .map(InvoiceDetailResponseDto.RoomBreakdownDto::getRoomCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        BigDecimal bookingOriginalTotal = booking.getItems().stream()
                .filter(item -> item != null && item.getStatus() != BookingItemStatus.CANCELLED)
                .map(this::calculateRoomOriginalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        for (BookingItem item : booking.getItems()) {
            if (item == null || item.getStatus() == BookingItemStatus.CANCELLED) {
                continue;
            }
            Room room = safeRoom(item.getRoomId());
            String roomCode = room != null ? room.getRoomNumber() : String.valueOf(item.getRoomId());
            if (existingRoomCodes.contains(roomCode)) {
                continue;
            }
            BigDecimal original = calculateRoomOriginalAmount(item);
            BigDecimal allocated = bookingOriginalTotal.compareTo(BigDecimal.ZERO) > 0
                    ? safe(totalPaid).multiply(original).divide(bookingOriginalTotal, 8, java.math.RoundingMode.HALF_UP).setScale(0, java.math.RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            InvoiceDetailResponseDto.RoomBreakdownDto dto = new InvoiceDetailResponseDto.RoomBreakdownDto();
            dto.setBookingRoomId(item.getId());
            dto.setRoomCode(roomCode);
            dto.setRoomName("Phòng " + roomCode);
            dto.setRoomType(room != null && room.getRoomType() != null ? room.getRoomType().getType() : null);
            dto.setCheckInDate(item.getCheckIn() != null ? item.getCheckIn().atStartOfDay() : null);
            dto.setPlannedCheckoutDate(item.getCheckOut() != null ? item.getCheckOut().atStartOfDay() : null);
            dto.setActualCheckoutDate(item.getActualCheckOutAt());
            dto.setOriginalAmount(original);
            dto.setUsedAmount(BigDecimal.ZERO);
            dto.setUnusedAmount(BigDecimal.ZERO);
            dto.setEarlyCheckoutRefund(BigDecimal.ZERO);
            dto.setHotelKeepAmount(BigDecimal.ZERO);
            dto.setAllocatedPaidAmount(allocated);
            dto.setNetRevenue(item.getStatus() == BookingItemStatus.CHECKED_OUT
                    ? safe(item.getFinalAmount()).max(BigDecimal.ZERO)
                    : BigDecimal.ZERO);
            dto.setRoomStatus(item.getStatus() != null ? item.getStatus().name() : null);
            rooms.add(dto);
        }
    }

    private void applyStaffFields(InvoiceDetailResponseDto dto, Booking booking) {
        if (dto == null || booking == null || booking.getItems() == null) {
            return;
        }
        Set<Long> checkinStaffIds = new LinkedHashSet<>();
        Set<Long> checkoutStaffIds = new LinkedHashSet<>();
        LocalDateTime lastCheckoutAt = null;
        for (BookingItem item : booking.getItems()) {
            if (item.getCheckedInByStaffId() != null) {
                checkinStaffIds.add(item.getCheckedInByStaffId());
            }
            if (item.getCheckedOutByStaffId() != null) {
                checkoutStaffIds.add(item.getCheckedOutByStaffId());
            }
            if (item.getActualCheckOutAt() != null
                    && (lastCheckoutAt == null || item.getActualCheckOutAt().isAfter(lastCheckoutAt))) {
                lastCheckoutAt = item.getActualCheckOutAt();
            }
        }
        if (!checkinStaffIds.isEmpty()) {
            if (checkinStaffIds.size() == 1) {
                Long staffId = checkinStaffIds.iterator().next();
                String staffName = resolveUserName(staffId);
                dto.setCheckinStaffId(String.valueOf(staffId));
                dto.setCheckinStaffName(staffName);
                dto.setCheckinStaff(staffName != null ? staffName : String.valueOf(staffId));
            } else {
                dto.setCheckinStaff("MULTIPLE");
            }
        }
        if (!checkoutStaffIds.isEmpty()) {
            if (checkoutStaffIds.size() == 1) {
                Long staffId = checkoutStaffIds.iterator().next();
                String staffName = resolveUserName(staffId);
                dto.setCheckoutStaffId(String.valueOf(staffId));
                dto.setCheckoutStaffName(staffName);
                if (dto.getCheckoutStaff() == null) {
                    dto.setCheckoutStaff(staffName != null ? staffName : String.valueOf(staffId));
                }
            } else {
                if (dto.getCheckoutStaff() == null) {
                    dto.setCheckoutStaff("MULTIPLE");
                }
            }
        }
        dto.setCheckoutTime(lastCheckoutAt);
    }

    private String resolveUserName(Long userId) {
        UserProfileDto profile = resolveUserProfile(userId);
        return profile != null && profile.getName() != null && !profile.getName().isBlank()
                ? profile.getName()
                : null;
    }

    private UserProfileDto resolveUserProfile(Long userId) {
        if (userId == null || userServiceClient == null) {
            return null;
        }
        try {
            return userServiceClient.getProfile(userId);
        } catch (Exception ex) {
            log.warn("Could not resolve user profile userId={}: {}", userId, ex.getMessage());
            return null;
        }
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime time) {
            return time;
        }
        try {
            return LocalDateTime.parse(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            String text = String.valueOf(value).trim();
            return text.isBlank() ? null : Long.parseLong(text);
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal calculateRoomOriginalAmount(BookingItem item) {
        if (item == null) {
            return BigDecimal.ZERO;
        }
        if (item.getRoomCharge() != null && item.getRoomCharge().compareTo(BigDecimal.ZERO) > 0) {
            return item.getRoomCharge();
        }
        if (item.getFinalAmount() != null && item.getFinalAmount().compareTo(BigDecimal.ZERO) > 0) {
            return item.getFinalAmount();
        }
        if (item.getFinalPrice() != null && item.getFinalPrice() > 0) {
            return BigDecimal.valueOf(item.getFinalPrice());
        }
        BigDecimal nightly = BigDecimal.valueOf(item.getPriceSnapshot() != null ? item.getPriceSnapshot() : 0.0);
        int nights = item.getNights() != null && item.getNights() > 0 ? item.getNights() : 1;
        return nightly.multiply(BigDecimal.valueOf(nights)).setScale(0, java.math.RoundingMode.HALF_UP);
    }

    private Room safeRoom(Long roomId) {
        if (roomId == null || roomServiceClient == null) {
            return null;
        }
        try {
            return roomServiceClient.getRoomById(roomId);
        } catch (Exception ignored) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInvoiceSummary() {
        List<BookingInvoice> invoices = invoiceRepository.findAll();
        Set<Long> bookingIds = invoices.stream()
                .map(BookingInvoice::getBookingId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Booking> bookingMap = loadBookingMapWithItems(bookingIds);
        BigDecimal grossInvoiceAmount = BigDecimal.ZERO;
        BigDecimal totalActualRevenue = BigDecimal.ZERO;
        BigDecimal totalRefundedAmount = BigDecimal.ZERO;
        BigDecimal totalAdditionalCharge = BigDecimal.ZERO;
        BigDecimal totalRemainingToPay = BigDecimal.ZERO;
        long paidInvoiceCount = 0L;
        long unpaidInvoiceCount = 0L;
        long partiallyPaidInvoiceCount = 0L;
        long refundedInvoiceCount = 0L;
        long pendingRefundCountByInvoice = 0L;

        for (BookingInvoice invoice : invoices) {
            Booking booking = bookingMap.get(invoice.getBookingId());
            InvoiceFinancials financials = readFinancials(invoice, booking);
            grossInvoiceAmount = grossInvoiceAmount.add(financials.grossOriginal);
            totalActualRevenue = totalActualRevenue.add(financials.netRevenue);
            totalAdditionalCharge = totalAdditionalCharge.add(financials.additionalCharge.add(financials.damageTotal));
            totalRemainingToPay = totalRemainingToPay.add(financials.remainingToPay);

            RefundAmounts refundAmounts = readRefundAmounts(invoice.getBookingId());
            totalRefundedAmount = totalRefundedAmount.add(refundAmounts.completed);
            String status = resolveInvoiceStatus(invoice, booking);
            if ("REFUNDED".equals(status)) {
                refundedInvoiceCount++;
            } else if ("PENDING_REFUND".equals(status)) {
                pendingRefundCountByInvoice++;
            } else if ("PARTIAL".equals(status)) {
                partiallyPaidInvoiceCount++;
            } else if ("COMPLETED".equals(status)) {
                paidInvoiceCount++;
            } else if ("DRAFT".equals(status)) {
                unpaidInvoiceCount++;
            }
        }

        var now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        var todayStart = now.atStartOfDay();
        var tomorrowStart = now.plusDays(1).atStartOfDay();

        var cb = entityManager.getCriteriaBuilder();
        var cqToday = cb.createQuery(Long.class);
        var rootToday = cqToday.from(BookingInvoice.class);
        cqToday.select(cb.count(rootToday));
        cqToday.where(cb.between(rootToday.get("createdAt"), todayStart, tomorrowStart));
        Long todayInvoiceCount = entityManager.createQuery(cqToday).getSingleResult();

        // pending refunds count/amount
        var cb2 = entityManager.getCriteriaBuilder();
        var cq2 = cb2.createQuery(Object[].class);
        var r2 = cq2.from(RefundTransaction.class);
        cq2.multiselect(cb2.coalesce(cb2.sum(r2.<Integer>get("amount")), 0), cb2.count(r2));
        cq2.where(r2.get("status").in(iuh.fit.hotelsystem_booking.entity.RefundStatus.PENDING, iuh.fit.hotelsystem_booking.entity.RefundStatus.ASSIGNED, iuh.fit.hotelsystem_booking.entity.RefundStatus.PROCESSING));
        Object[] pendingRes = entityManager.createQuery(cq2).getSingleResult();
        BigDecimal pendingTotal = BigDecimal.ZERO;
        if (pendingRes[0] instanceof Number) pendingTotal = BigDecimal.valueOf(((Number) pendingRes[0]).doubleValue());
        Long pendingCount = ((Number) pendingRes[1]).longValue();

        Map<String, Object> out = new HashMap<>();
        out.put("totalInvoices", invoices.size());
        out.put("grossInvoiceAmount", grossInvoiceAmount);
        out.put("totalActualRevenue", totalActualRevenue);
        out.put("totalRefundedAmount", totalRefundedAmount);
        out.put("totalPendingRefundAmount", pendingTotal);
        out.put("totalAdditionalCharge", totalAdditionalCharge);
        out.put("totalRemainingToPay", totalRemainingToPay);
        out.put("paidInvoiceCount", paidInvoiceCount);
        out.put("unpaidInvoiceCount", unpaidInvoiceCount);
        out.put("partiallyPaidInvoiceCount", partiallyPaidInvoiceCount);
        out.put("refundedInvoiceCount", refundedInvoiceCount);
        out.put("todayInvoiceCount", todayInvoiceCount);
        out.put("pendingRefundCount", Math.max(pendingCount, pendingRefundCountByInvoice));
        return out;
    }
}
