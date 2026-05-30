package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
import iuh.fit.hotelsystem_booking.dto.invoice.InvoiceDetailResponseDto;
import iuh.fit.hotelsystem_booking.dto.invoice.InvoiceListDto;
import iuh.fit.hotelsystem_booking.dto.invoice.InvoiceSearchResponseDto;
import iuh.fit.hotelsystem_booking.dto.invoice.InvoiceSummaryDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class BookingInvoiceService {

    private static final Logger log = LoggerFactory.getLogger(BookingInvoiceService.class);

    private final BookingInvoiceRepository invoiceRepository;
    private final BookingRepository bookingRepository;
    private final BookingStayRepository bookingStayRepository;
    private final BookingGuestService bookingGuestService;
    private final RefundTransactionRepository refundTransactionRepository;
    private final ObjectMapper objectMapper;
    private final jakarta.persistence.EntityManager entityManager;

    public BookingInvoiceService(BookingInvoiceRepository invoiceRepository,
            BookingRepository bookingRepository,
            BookingStayRepository bookingStayRepository,
            BookingGuestService bookingGuestService,
            RefundTransactionRepository refundTransactionRepository,
            ObjectMapper objectMapper,
            jakarta.persistence.EntityManager entityManager) {
        this.invoiceRepository = invoiceRepository;
        this.bookingRepository = bookingRepository;
        this.bookingStayRepository = bookingStayRepository;
        this.bookingGuestService = bookingGuestService;
        this.refundTransactionRepository = refundTransactionRepository;
        this.objectMapper = objectMapper;
        this.entityManager = entityManager;
    }

    @Transactional
    public BookingInvoice saveCheckoutInvoice(Long bookingId, BigDecimal amount, String currency,
            Map<String, Object> lines) {
        try {
            log.info("SAVE CHECKOUT INVOICE START bookingId={}, amount={}, currency={}", bookingId, amount, currency);
            Optional<BookingInvoice> existingInvoice = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId);
            if (existingInvoice.isPresent() && isMergeableCheckoutPayload(lines)) {
                return mergeCheckoutInvoice(bookingId, amount, currency, lines);
            }
            BookingInvoice invoice = existingInvoice.orElseGet(BookingInvoice::new);
            if (invoice.getId() == null) {
                invoice.setBookingId(bookingId);
                invoice.setCreatedAt(LocalDateTime.now());
            }
            invoice.setAmount(amount != null ? amount : BigDecimal.ZERO);
            invoice.setCurrency(currency != null ? currency : "VND");
            invoice.setLinesJson(objectMapper.writeValueAsString(lines != null ? lines : Map.of()));
            // If payload includes denormalized aggregates, persist them into columns for fast queries
            if (lines != null) {
                invoice.setTotalOriginalAmount(toBigDecimal(lines.get("totalOriginalAmount")));
                invoice.setTotalAllocatedPaidAmount(toBigDecimal(lines.get("totalAllocatedPaidAmount")));
                invoice.setTotalActualRevenue(toBigDecimal(lines.get("totalActualRevenue")));
                invoice.setTotalEarlyCheckoutRefund(toBigDecimal(lines.get("totalEarlyCheckoutRefund")));
                invoice.setTotalAdditionalCharge(toBigDecimal(lines.get("totalAdditionalCharge")));
                invoice.setTotalRefundToCustomer(toBigDecimal(lines.get("totalRefundToCustomer")));
                invoice.setRemainingBalance(toBigDecimal(lines.get("remainingBalance")));
            }
            applyInvoiceMetadata(invoice, lines);
            BookingInvoice saved = invoiceRepository.saveAndFlush(invoice);
            log.info("SAVE CHECKOUT INVOICE DONE bookingId={}, invoiceId={}", bookingId, saved.getId());
            return saved;
        } catch (Exception ex) {
            log.error("SAVE CHECKOUT INVOICE ERROR FULL bookingId={}", bookingId, ex);
            throw new IllegalStateException("Không thể lưu hóa đơn checkout", ex);
        }
    }

    /**
     * Merge (tích lũy) invoice theo từng phòng — không overwrite dữ liệu phòng đã checkout trước.
     * Khi checkout phòng mới, chỉ thêm lines của phòng mới vào invoice hiện có.
     * Tính lại các tổng booking-level dựa trên tất cả lines hiện có.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public BookingInvoice mergeCheckoutInvoice(Long bookingId, BigDecimal newRoomAmount, String currency,
            Map<String, Object> newPayload) {
        try {
            log.info("MERGE CHECKOUT INVOICE START bookingId={}, newRoomAmount={}", bookingId, newRoomAmount);

            // Acquire DB-level pessimistic lock on latest invoice row to avoid lost-update
            BookingInvoice invoice = null;
            try {
                invoice = invoiceRepository.findLatestByBookingIdForUpdate(bookingId).orElse(null);
            } catch (Exception ex) {
                // fallback to repository non-locking method
                invoice = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElse(null);
            }
            boolean isNew = invoice == null || invoice.getId() == null;
            if (isNew) {
                invoice = new BookingInvoice();
                invoice.setBookingId(bookingId);
                invoice.setCreatedAt(LocalDateTime.now());
            }

            // Parse existing payload
            Map<String, Object> existing = new java.util.LinkedHashMap<>();
            if (!isNew && invoice.getLinesJson() != null) {
                try {
                    Object parsed = objectMapper.readValue(invoice.getLinesJson(), Object.class);
                    if (parsed instanceof Map) {
                        Map<?, ?> m = (Map<?, ?>) parsed;
                        m.forEach((k, v) -> existing.put(String.valueOf(k), v));
                    }
                } catch (Exception ignored) {}
            }

            // Merge invoiceItems — chỉ thêm items của phòng mới, giữ nguyên items cũ
            List<Object> existingItems = existing.get("invoiceItems") instanceof List
                    ? new ArrayList<>((List<Object>) existing.get("invoiceItems"))
                    : new ArrayList<>();
            List<Object> newItems = newPayload.get("invoiceItems") instanceof List
                    ? (List<Object>) newPayload.get("invoiceItems")
                    : List.of();

            // Lấy tập bookingRoomId đã có trong invoice cũ để không duplicate
            java.util.Set<Object> existingRoomLineKeys = new java.util.HashSet<>();
            for (Object item : existingItems) {
                if (item instanceof Map) {
                    Map<?, ?> m = (Map<?, ?>) item;
                    Object brid = m.get("bookingRoomId");
                    Object type = m.get("itemType");
                    if (brid != null && type != null) {
                        existingRoomLineKeys.add(brid + "::" + type);
                    }
                }
            }

            // Thêm line mới nếu chưa tồn tại (idempotent per bookingRoomId + itemType)
            for (Object item : newItems) {
                if (item instanceof Map) {
                    Map<?, ?> m = (Map<?, ?>) item;
                    Object brid = m.get("bookingRoomId");
                    Object type = m.get("itemType");
                    String key = brid + "::" + type;
                    // SERVICE / ADJUSTMENT không có bookingRoomId cố định → luôn thêm
                    boolean isRoomLine = "ROOM".equals(m.get("category"));
                    if (isRoomLine && existingRoomLineKeys.contains(key)) {
                        continue; // Bỏ qua — phòng này đã có line trong invoice cũ
                    }
                    existingItems.add(item);
                    if (brid != null && type != null) existingRoomLineKeys.add(key);
                }
            }

            // Merge roomSummaries — thêm phòng mới, giữ nguyên phòng cũ
            List<Object> existingSummaries = existing.get("roomSummaries") instanceof List
                    ? new ArrayList<>((List<Object>) existing.get("roomSummaries"))
                    : new ArrayList<>();
            java.util.Set<Object> existingRoomSummaryIds = new java.util.HashSet<>();
            for (Object s : existingSummaries) {
                if (s instanceof Map) {
                    Map<?, ?> m = (Map<?, ?>) s;
                    existingRoomSummaryIds.add(m.get("bookingRoomId"));
                }
            }
            List<Object> newSummaries = newPayload.get("roomSummaries") instanceof List
                    ? (List<Object>) newPayload.get("roomSummaries")
                    : List.of();
            for (Object s : newSummaries) {
                if (s instanceof Map) {
                    Map<?, ?> m = (Map<?, ?>) s;
                    if (!existingRoomSummaryIds.contains(m.get("bookingRoomId"))) {
                        existingSummaries.add(s);
                        existingRoomSummaryIds.add(m.get("bookingRoomId"));
                    }
                }
            }

            // Tính lại các tổng booking-level từ roomSummaries + invoiceItems đã merge
            BigDecimal totalOriginalAmount = BigDecimal.ZERO;
            BigDecimal totalUsedRoomAmount = BigDecimal.ZERO;
            BigDecimal totalUnusedRoomAmount = BigDecimal.ZERO;
            BigDecimal totalHotelKeepAmount = BigDecimal.ZERO;
            BigDecimal totalAllocatedPaidAmount = BigDecimal.ZERO;
            BigDecimal totalActualRevenue = BigDecimal.ZERO;
            BigDecimal totalRefundToCustomer = BigDecimal.ZERO;
            BigDecimal totalAdditionalCharge = BigDecimal.ZERO;
            BigDecimal roomServiceFeeTotal = BigDecimal.ZERO;
            BigDecimal totalEarlyRefund = BigDecimal.ZERO;
            BigDecimal totalService = BigDecimal.ZERO;
            BigDecimal bookingServiceTotal = BigDecimal.ZERO;
            BigDecimal draftServiceLinesTotal = BigDecimal.ZERO;
            BigDecimal damageFeeTotal = BigDecimal.ZERO;
            BigDecimal manualSurchargeTotal = BigDecimal.ZERO;
            BigDecimal lateCheckoutFeeTotal = BigDecimal.ZERO;
            BigDecimal earlyCheckinFeeTotal = BigDecimal.ZERO;

            for (Object summary : existingSummaries) {
                if (!(summary instanceof Map)) {
                    continue;
                }
                Map<?, ?> m = (Map<?, ?>) summary;
                totalOriginalAmount = totalOriginalAmount.add(firstNonZero(m, "roomOriginalAmount", "roomCharge"));
                totalUsedRoomAmount = totalUsedRoomAmount.add(firstNonZero(m, "usedRoomAmount", "usedNightAmount"));
                totalUnusedRoomAmount = totalUnusedRoomAmount.add(firstNonZero(m, "unusedRoomAmount", "unusedNightAmount"));
                totalHotelKeepAmount = totalHotelKeepAmount.add(firstNonZero(m, "hotelKeepAmount", "hotelPenaltyAmount"));
                totalAllocatedPaidAmount = totalAllocatedPaidAmount.add(firstNonZero(m, "allocatedPaidAmount", "paidAllocated"));
                BigDecimal actualRevenue = toBigDecimal(m.get("actualRoomRevenue"));
                if (actualRevenue.compareTo(BigDecimal.ZERO) == 0) {
                    actualRevenue = firstNonZero(m, "roomCharge").subtract(firstNonZero(m, "earlyCheckoutRefund", "hotelPenaltyAmount")).max(BigDecimal.ZERO);
                }
                totalActualRevenue = totalActualRevenue.add(actualRevenue);
                BigDecimal refundToCustomer = firstNonZero(m, "refundToCustomer");
                if (refundToCustomer.compareTo(BigDecimal.ZERO) == 0) {
                    refundToCustomer = firstNonZero(m, "netRefundForRoom").max(BigDecimal.ZERO);
                }
                totalRefundToCustomer = totalRefundToCustomer.add(refundToCustomer);
                BigDecimal additionalCharge = firstNonZero(m, "additionalCharge");
                if (additionalCharge.compareTo(BigDecimal.ZERO) == 0) {
                    additionalCharge = firstNonZero(m, "additionalChargeForRoom").max(BigDecimal.ZERO);
                }
                totalAdditionalCharge = totalAdditionalCharge.add(additionalCharge);
                roomServiceFeeTotal = roomServiceFeeTotal.add(firstNonZero(m, "serviceCharge"));
                damageFeeTotal = damageFeeTotal.add(firstNonZero(m, "damageFee"));
                manualSurchargeTotal = manualSurchargeTotal.add(firstNonZero(m, "manualSurcharge"));
                lateCheckoutFeeTotal = lateCheckoutFeeTotal.add(firstNonZero(m, "lateCheckoutFee"));
                earlyCheckinFeeTotal = earlyCheckinFeeTotal.add(firstNonZero(m, "earlyCheckinFee"));
                totalEarlyRefund = totalEarlyRefund.add(firstNonZero(m, "earlyCheckoutRefund"));
            }

            for (Object item : existingItems) {
                if (!(item instanceof Map)) {
                    continue;
                }
                Map<?, ?> m = (Map<?, ?>) item;
                BigDecimal amt = toBigDecimal(m.get("amount"));
                String cat = String.valueOf(m.get("category"));
                String typ = String.valueOf(m.get("itemType"));
                if ("SERVICE".equals(cat)) {
                    totalService = totalService.add(amt);
                    if ("DRAFT_SERVICE_LINE".equals(typ)) {
                        draftServiceLinesTotal = draftServiceLinesTotal.add(amt);
                    } else {
                        bookingServiceTotal = bookingServiceTotal.add(amt);
                    }
                }
            }

                BigDecimal actualRoomCharge = totalActualRevenue;
                BigDecimal grandTotal = actualRoomCharge
                    .add(roomServiceFeeTotal)
                    .add(totalService)
                    .add(damageFeeTotal)
                    .add(manualSurchargeTotal)
                    .add(lateCheckoutFeeTotal)
                    .add(earlyCheckinFeeTotal);

                // Use computed totalAllocatedPaidAmount (aggregated from room summaries) as authoritative paid amount
                BigDecimal totalPaid = totalAllocatedPaidAmount != null ? totalAllocatedPaidAmount : BigDecimal.ZERO;
                BigDecimal remaining = grandTotal.subtract(totalPaid);
                BigDecimal refundSettlement = totalPaid.subtract(grandTotal).max(BigDecimal.ZERO);

            // Build merged payload
            Map<String, Object> merged = new java.util.LinkedHashMap<>(existing);
            merged.putAll(newPayload); // overwrite booking-level keys với values mới
            merged.put("invoiceItems", existingItems);
            merged.put("roomSummaries", existingSummaries);
            merged.put("totalOriginalAmount", totalOriginalAmount);
            merged.put("totalUsedRoomAmount", totalUsedRoomAmount);
            merged.put("totalUnusedRoomAmount", totalUnusedRoomAmount);
            merged.put("totalHotelKeepAmount", totalHotelKeepAmount);
            merged.put("totalAllocatedPaidAmount", totalAllocatedPaidAmount);
            merged.put("totalActualRevenue", totalActualRevenue);
            merged.put("totalRefundToCustomer", totalRefundToCustomer);
            merged.put("totalAdditionalCharge", totalAdditionalCharge);
            merged.put("roomCharge", totalOriginalAmount);
            merged.put("totalEarlyCheckoutRefund", totalEarlyRefund);
            merged.put("earlyCheckoutAdjustment", totalEarlyRefund);
            merged.put("roomServiceFeeTotal", roomServiceFeeTotal);
            merged.put("actualRoomCharge", actualRoomCharge);
            merged.put("serviceTotal", totalService);
            merged.put("bookingServiceTotal", bookingServiceTotal);
            merged.put("draftServiceLinesTotal", draftServiceLinesTotal);
            merged.put("manualServiceTotal", roomServiceFeeTotal);
            merged.put("damageFeeTotal", damageFeeTotal);
            merged.put("manualSurchargeTotal", manualSurchargeTotal);
            merged.put("lateCheckoutFeeTotal", lateCheckoutFeeTotal);
            merged.put("earlyCheckinFeeTotal", earlyCheckinFeeTotal);
            merged.put("grandTotal", grandTotal);
            merged.put("totalActualRevenue", totalActualRevenue);
            // Normalize paid fields to computed authoritative value
            merged.put("amountPaid", totalPaid);
            merged.put("paidAmount", totalPaid);
            merged.put("totalPaidAmount", totalPaid);
            merged.put("totalAmount", grandTotal);
            merged.put("remainingBalance", remaining);
            merged.put("remainingRoomAmount", remaining);
            merged.put("refundSettlementAmount", refundSettlement);
            merged.put("additionalRefundAmount", refundSettlement);
            merged.put("paymentRequired", remaining.compareTo(BigDecimal.ZERO) > 0);
            merged.put("refundRequired", refundSettlement.compareTo(BigDecimal.ZERO) > 0);
            merged.put("mergedAt", LocalDateTime.now().toString());

            invoice.setAmount(grandTotal);
            // Persist denormalized aggregates for faster search/statistics
            invoice.setTotalOriginalAmount(totalOriginalAmount);
            invoice.setTotalAllocatedPaidAmount(totalAllocatedPaidAmount);
            invoice.setTotalActualRevenue(totalActualRevenue);
            invoice.setTotalEarlyCheckoutRefund(totalEarlyRefund);
            invoice.setTotalAdditionalCharge(totalAdditionalCharge);
            invoice.setTotalRefundToCustomer(totalRefundToCustomer);
            invoice.setRemainingBalance(remaining);
            invoice.setCurrency(currency != null ? currency : "VND");
            invoice.setLinesJson(objectMapper.writeValueAsString(merged));
            applyInvoiceMetadata(invoice, merged);
            BookingInvoice saved = invoiceRepository.saveAndFlush(invoice);
            log.info("MERGE CHECKOUT INVOICE DONE bookingId={}, invoiceId={}, grandTotal={}", bookingId, saved.getId(), grandTotal);
            return saved;
        } catch (Exception ex) {
            log.error("MERGE CHECKOUT INVOICE ERROR bookingId={}", bookingId, ex);
            throw new IllegalStateException("Không thể merge hóa đơn checkout", ex);
        }
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val instanceof BigDecimal) return (BigDecimal) val;
        if (val instanceof Number) return BigDecimal.valueOf(((Number) val).doubleValue());
        if (val instanceof String s) { try { return new BigDecimal(s); } catch (Exception ignored) {} }
        return BigDecimal.ZERO;
    }

    private boolean isMergeableCheckoutPayload(Map<String, Object> lines) {
        return lines != null && (lines.get("invoiceItems") instanceof List<?> || lines.get("roomSummaries") instanceof List<?>);
    }

    private void applyInvoiceMetadata(BookingInvoice invoice, Map<String, Object> lines) {
        if (invoice == null) {
            return;
        }
        if (invoice.getId() != null) {
            invoice.setInvoiceCode("INV-" + String.format("%06d", invoice.getId()));
        }
        invoice.setInvoiceStatus(resolveInvoiceStatus(invoice.getBookingId(), lines));
        invoice.setPaymentStatus(resolvePaymentStatus(invoice.getBookingId(), lines));

        try {
            List<BookingGuest> guests = bookingGuestService.getGuests(invoice.getBookingId());
            BookingGuest representative = pickRepresentativeGuest(guests);
            if (representative != null) {
                invoice.setCustomerName(representative.getFullName());
                invoice.setCustomerPhone(representative.getPhone());
            }
        } catch (Exception ignored) {
        }
    }

    private String resolveInvoiceStatus(Long bookingId, Map<String, Object> lines) {
        if (lines != null && lines.get("invoiceStatus") != null) {
            return normalizeInvoiceStatus(String.valueOf(lines.get("invoiceStatus")));
        }
        Optional<Booking> bookingOpt = bookingRepository.findByIdWithItems(bookingId);
        if (bookingOpt.isEmpty()) {
            return "DRAFT";
        }
        Booking booking = bookingOpt.get();
        if (booking.getStatus() != null && booking.getStatus().name().contains("CANCEL")) {
            return "CANCELLED";
        }
        if (booking.getItems() == null || booking.getItems().isEmpty()) {
            return "DRAFT";
        }
        List<?> activeRooms = booking.getItems().stream()
                .filter(room -> room != null && room.getStatus() != BookingItemStatus.CANCELLED)
                .toList();
        if (activeRooms.isEmpty()) {
            return "CANCELLED";
        }
        boolean allCheckedOut = booking.getItems().stream()
                .filter(room -> room != null && room.getStatus() != BookingItemStatus.CANCELLED)
                .allMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT);
        boolean anyCheckedOut = booking.getItems().stream()
                .filter(room -> room != null && room.getStatus() != BookingItemStatus.CANCELLED)
                .anyMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT);
        if (allCheckedOut) {
            return "COMPLETED";
        }
        if (anyCheckedOut) {
            return "PARTIAL";
        }
        return "DRAFT";
    }

    private String normalizeInvoiceStatus(String status) {
        if (status == null || status.isBlank()) {
            return "DRAFT";
        }
        String normalized = status.trim().toUpperCase(java.util.Locale.ROOT);
        if ("PARTIAL_CHECKOUT".equals(normalized) || "PARTIALLY_CHECKED_OUT".equals(normalized)) {
            return "PARTIAL";
        }
        if ("CHECKED_OUT".equals(normalized)) {
            return "COMPLETED";
        }
        return normalized;
    }

    private String resolvePaymentStatus(Long bookingId, Map<String, Object> lines) {
        if (lines != null && lines.get("paymentStatus") != null) {
            return String.valueOf(lines.get("paymentStatus")).trim().toUpperCase(java.util.Locale.ROOT);
        }
        BigDecimal paid = lines != null ? firstNonZero(lines, "totalAllocatedPaidAmount", "amountPaid") : BigDecimal.ZERO;
        BigDecimal remaining = lines != null ? toBigDecimal(lines.get("remainingBalance")) : BigDecimal.ZERO;
        BigDecimal refund = lines != null
                ? firstNonZero(lines, "totalRefundToCustomer", "refundSettlementAmount")
                : BigDecimal.ZERO;
        boolean hasPendingRefund = refundTransactionRepository.findFirstByBookingId(bookingId)
                .map(refundTransaction -> refundTransaction.getStatus() != null
                        && List.of(
                                iuh.fit.hotelsystem_booking.entity.RefundStatus.PENDING,
                                iuh.fit.hotelsystem_booking.entity.RefundStatus.ASSIGNED,
                                iuh.fit.hotelsystem_booking.entity.RefundStatus.PROCESSING,
                                iuh.fit.hotelsystem_booking.entity.RefundStatus.APPROVED)
                        .contains(refundTransaction.getStatus()))
                .orElse(false);
        if (hasPendingRefund || refund.compareTo(BigDecimal.ZERO) > 0) {
            return "PENDING_REFUND";
        }
        if (paid.compareTo(BigDecimal.ZERO) == 0) {
            return "UNPAID";
        }
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY_PAID";
        }
        return "PAID";
    }

    private BigDecimal firstNonZero(Map<?, ?> map, String primaryKey, String fallbackKey) {
        BigDecimal primary = toBigDecimal(map.get(primaryKey));
        if (primary.compareTo(BigDecimal.ZERO) != 0) {
            return primary;
        }
        if (fallbackKey == null) {
            return primary;
        }
        return toBigDecimal(map.get(fallbackKey));
    }

    private BigDecimal firstNonZero(Map<?, ?> map, String key) {
        return toBigDecimal(map.get(key));
    }

    @Transactional(readOnly = true)
    public BookingInvoiceDto getLatestInvoice(Long bookingId) {
        BookingInvoice invoice = invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found for booking: " + bookingId));
        return toDto(invoice);
    }

    @Transactional(readOnly = true)
    public Optional<BookingInvoiceDto> findLatestInvoice(Long bookingId) {
        return invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(bookingId)
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public List<BookingInvoiceDto> listInvoices() {
        Map<Long, BookingInvoiceDto> resultByBooking = new LinkedHashMap<>();
        Pageable pageable = PageRequest.of(0, 200, Sort.by(Sort.Direction.DESC, "createdAt"));
        for (BookingInvoice invoice : invoiceRepository.findAll(pageable).getContent()) {
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
        dto.setPaidAmount(invoice.getAmount());
        dto.setTotalAmount(invoice.getAmount());
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
        if (!(dto.getLines() instanceof Map)) {
            return;
        }
        Map<?, ?> lines = (Map<?, ?>) dto.getLines();
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
