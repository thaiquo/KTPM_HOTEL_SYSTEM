package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.dto.invoice.*;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
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
    private final ObjectMapper objectMapper;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional(readOnly = true)
    public InvoiceSearchResponseDto searchInvoices(
            String invoiceCode, String bookingCode, String customerName, String customerPhone,
            LocalDate specificDate, LocalDate fromDate, LocalDate toDate,
            List<String> invoiceStatuses, String paymentStatus,
            int page, int size) {

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
        Set<Long> bookingIdsInPage = invoicePage.getContent().stream().map(BookingInvoice::getBookingId).collect(Collectors.toSet());
        Map<Long, Booking> bookingMap = bookingIdsInPage.isEmpty() ? Collections.emptyMap() :
                bookingRepository.findAllById(bookingIdsInPage).stream().collect(Collectors.toMap(Booking::getId, b -> b));
        Map<Long, BookingGuest> guestMap = loadPrimaryGuestMap(bookingIdsInPage);

        List<InvoiceListDto> content = invoicePage.getContent().stream()
                .map(inv -> mapToListDto(inv, bookingMap.get(inv.getBookingId()), guestMap.get(inv.getBookingId())))
                .collect(Collectors.toList());

        // 6. Aggregate summary across ALL matching invoices using Criteria API on denormalized columns
        // (faster than loading JSON payloads for thousands of rows)
        var cb = entityManager.getCriteriaBuilder();
        var cq = cb.createTupleQuery();
        var root = cq.from(BookingInvoice.class);
        Predicate predicate = spec.toPredicate(root, cq, cb);
        cq.multiselect(
                cb.coalesce(cb.sum(root.get("totalOriginalAmount")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("totalAllocatedPaidAmount")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("totalActualRevenue")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("totalEarlyCheckoutRefund")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("totalRefundToCustomer")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("totalAdditionalCharge")), cb.literal(BigDecimal.ZERO)),
                cb.coalesce(cb.sum(root.get("remainingBalance")), cb.literal(BigDecimal.ZERO)),
                cb.count(root)
        );
        if (predicate != null) cq.where(predicate);
        var tuple = entityManager.createQuery(cq).getSingleResult();

        InvoiceSummaryDto summary = new InvoiceSummaryDto();
        summary.setTotalInvoices(((Number) tuple.get(7)).intValue());
        summary.setGrossInvoiceAmount((BigDecimal) tuple.get(0));
        summary.setTotalPaidAmount((BigDecimal) tuple.get(1));
        summary.setTotalActualRevenue((BigDecimal) tuple.get(2));
        summary.setTotalEarlyCheckoutRefund((BigDecimal) tuple.get(3));
        summary.setTotalRefundAmount((BigDecimal) tuple.get(4));
        summary.setTotalAdditionalCharge((BigDecimal) tuple.get(5));
        summary.setTotalRemainingAmount((BigDecimal) tuple.get(6));
        summary.setTotalRemainingToPay((BigDecimal) tuple.get(6));

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

        // Parse JSON safely
        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal refunds = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;

        try {
            Map<String, Object> linesMap = objectMapper.readValue(inv.getLinesJson(), new TypeReference<>() {});
            gross = getBd(linesMap, "totalOriginalAmount", inv.getAmount());
            refunds = getBd(linesMap, "totalEarlyCheckoutRefund", getBd(linesMap, "earlyCheckoutRefund", BigDecimal.ZERO));
            paid = getBd(linesMap, "amountPaid", inv.getAmount());
            
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
            gross = inv.getAmount() != null ? inv.getAmount() : BigDecimal.ZERO;
            paid = gross;
        }

        BigDecimal net = gross.subtract(refunds).max(BigDecimal.ZERO);
        BigDecimal remaining = net.subtract(paid).max(BigDecimal.ZERO);
        
        dto.setGrossInvoiceAmount(gross);
        dto.setTotalRefundAmount(refunds);
        dto.setNetRevenue(net);
        dto.setPaidAmount(paid);
        dto.setRemainingAmount(remaining);
        dto.setInvoiceStatus(resolveInvoiceStatus(b, paid, remaining, refunds));
        dto.setPaymentStatus(resolvePaymentStatus(paid, remaining, refunds));

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

    private boolean filterByInvoiceStatus(InvoiceListDto dto, List<String> invoiceStatuses, String paymentStatus) {
        if (dto == null) {
            return false;
        }
        if (invoiceStatuses != null && !invoiceStatuses.isEmpty() && !invoiceStatuses.contains("ALL")) {
            String actualInvoiceStatus = dto.getInvoiceStatus() != null ? dto.getInvoiceStatus() : "DRAFT";
            if (!invoiceStatuses.contains(actualInvoiceStatus)) {
                return false;
            }
        }
        if (paymentStatus != null && !paymentStatus.isBlank() && !"ALL".equalsIgnoreCase(paymentStatus)) {
            if (dto.getPaymentStatus() == null || !paymentStatus.equalsIgnoreCase(dto.getPaymentStatus())) {
                return false;
            }
        }
        return true;
    }

    private String resolveInvoiceStatus(Booking booking, BigDecimal paid, BigDecimal remaining, BigDecimal refundAmount) {
        if (booking != null && booking.getStatus() != null && booking.getStatus().name().contains("CANCEL")) {
            return "CANCELLED";
        }
        if (paid.compareTo(BigDecimal.ZERO) == 0) {
            return "DRAFT";
        }
        if (remaining.compareTo(BigDecimal.ZERO) > 0 || refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIAL";
        }
        return "COMPLETED";
    }

    private String resolvePaymentStatus(BigDecimal paid, BigDecimal remaining, BigDecimal refundAmount) {
        if (refundAmount.compareTo(BigDecimal.ZERO) > 0 && remaining.compareTo(BigDecimal.ZERO) == 0 && paid.compareTo(BigDecimal.ZERO) > 0) {
            return "REFUNDED";
        }
        if (paid.compareTo(BigDecimal.ZERO) == 0) {
            return "UNPAID";
        }
        if (remaining.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY_PAID";
        }
        return "PAID";
    }

    @Transactional(readOnly = true)
    public InvoiceDetailResponseDto getInvoiceDetail(Long invoiceId) {
        BookingInvoice inv = invoiceRepository.findById(invoiceId)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
            
        Booking b = bookingRepository.findById(inv.getBookingId()).orElse(null);
        List<BookingGuest> guests = loadGuestsForBooking(inv.getBookingId());

        InvoiceDetailResponseDto dto = new InvoiceDetailResponseDto();
        dto.setId(inv.getId());
        dto.setInvoiceCode("INV-" + String.format("%06d", inv.getId()));
        dto.setBookingId(inv.getBookingId());
        if (b != null) dto.setBookingCode(b.getBookingCode());
        dto.setCreatedAt(inv.getCreatedAt());

        if (!guests.isEmpty()) {
            BookingGuest primary = guests.get(0);
            InvoiceDetailResponseDto.CustomerInfo c = new InvoiceDetailResponseDto.CustomerInfo();
            c.setFullName(primary.getFullName());
            c.setPhone(primary.getPhone());
            c.setCccd(primary.getCccd() != null ? primary.getCccd() : primary.getPassport());
            dto.setCustomer(c);
        }

            BigDecimal paid = BigDecimal.ZERO;
        try {
            Map<String, Object> m = objectMapper.readValue(inv.getLinesJson(), new TypeReference<>() {});
            
            // Rooms breakdown
            List<InvoiceDetailResponseDto.RoomBreakdownDto> rDtoList = new ArrayList<>();
            List<Map<String,Object>> roomSummaries = (List<Map<String,Object>>) m.get("roomSummaries");
            if (roomSummaries != null) {
                for (Map<String,Object> rs : roomSummaries) {
                    InvoiceDetailResponseDto.RoomBreakdownDto r = new InvoiceDetailResponseDto.RoomBreakdownDto();
                    r.setRoomName("Phòng " + rs.get("roomNumber"));
                    r.setRoomType((String) rs.get("roomType")); // or derived from another key
                    r.setOriginalAmount(getBd(rs, "roomOriginalAmount", getBd(rs, "roomCharge", BigDecimal.ZERO)));
                    r.setUsedAmount(getBd(rs, "usedRoomAmount", getBd(rs, "usedNightAmount", BigDecimal.ZERO)));
                    r.setUnusedAmount(getBd(rs, "unusedRoomAmount", getBd(rs, "unusedNightAmount", BigDecimal.ZERO)));
                    r.setEarlyCheckoutRefund(getBd(rs, "earlyCheckoutRefund", BigDecimal.ZERO));
                    r.setHotelKeepAmount(getBd(rs, "hotelKeepAmount", getBd(rs, "hotelPenaltyAmount", BigDecimal.ZERO)));
                    r.setNetRevenue(getBd(rs, "actualRoomRevenue", r.getOriginalAmount().subtract(r.getEarlyCheckoutRefund()).max(BigDecimal.ZERO)));
                    r.setAllocatedPaidAmount(getBd(rs, "allocatedPaidAmount", getBd(rs, "paidAllocated", BigDecimal.ZERO)));
                    rDtoList.add(r);
                }
            }
            dto.setRooms(rDtoList);

            // Fetch generic invoice lines
            List<Map<String,Object>> invoiceLines = (List<Map<String,Object>>) m.get("invoiceLines");
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
            dto.setInvoiceLines(invoiceLines != null ? invoiceLines : Collections.emptyList());
            
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
            
            rs.setTotalRoomAmount(totalActualRev);
            rs.setTotalServiceAmount(serviceTotal.add(roomServiceFeeTotal).add(manualSurcharge));
            rs.setTotalDamageAmount(damageTotal);
            rs.setGrossInvoiceAmount(gross);
            rs.setTotalEarlyCheckoutRefundAmount(refundEarly);
            rs.setTotalActualRevenue(getBd(m, "totalActualRevenue", totalActualRev));
            rs.setNetRevenue(gross.subtract(refundEarly).max(BigDecimal.ZERO));
            rs.setRefundToCustomer(getBd(m, "totalRefundToCustomer", BigDecimal.ZERO));
            rs.setTotalPaidAmount(paid);
            rs.setTotalAllocatedPaidAmount(getBd(m, "totalAllocatedPaidAmount", paid));
            rs.setRemainingAmount(rs.getNetRevenue().subtract(paid).max(BigDecimal.ZERO));
            rs.setAdditionalRefundAmount(getBd(m, "additionalRefundAmount", getBd(m, "refundSettlementAmount", BigDecimal.ZERO)));
            rs.setAdditionalChargeAmount(getBd(m, "totalAdditionalCharge", BigDecimal.ZERO));
            rs.setRemainingToPay(rs.getNetRevenue().subtract(paid).max(BigDecimal.ZERO));

            dto.setRevenueSummary(rs);

            // Try to read checkout staff / processedBy from snapshot JSON if available
            String checkoutStaff = null;
            if (m.containsKey("processedBy")) {
                checkoutStaff = String.valueOf(m.get("processedBy"));
            } else if (m.containsKey("checkoutStaff")) {
                checkoutStaff = String.valueOf(m.get("checkoutStaff"));
            }
            if ((checkoutStaff == null || checkoutStaff.isBlank()) && b != null && b.getCreatedBy() != null) {
                checkoutStaff = b.getCreatedBy();
            }
            if (checkoutStaff != null && !checkoutStaff.isBlank()) dto.setCheckoutStaff(checkoutStaff);
            
        } catch (Exception ignored) {
            log.error("Failed to parse invoice json", ignored);
        }

        // Fetch Payments (For now omitted as there is no local Payment entity, mapped from booking.getPaidAmount())
        List<InvoiceDetailResponseDto.PaymentRecord> pRecords = new ArrayList<>();
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            InvoiceDetailResponseDto.PaymentRecord pr = new InvoiceDetailResponseDto.PaymentRecord();
            pr.setTime(inv.getCreatedAt()); // approximate
            pr.setAmount(paid);
            pr.setMethod(b != null && b.getPaymentType() != null ? b.getPaymentType() : "CASH/TRANSFER");
            pr.setStatus("SUCCESS");
            pRecords.add(pr);
        }
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
            rr.setStaff(r.getProcessedBy() != null ? r.getProcessedBy() : "-");
            rRecords.add(rr);

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
            // set top-level fields
            dto.setRefundStatus(refundStatus);
            if (b != null) {
                dto.setStatus(b.getStatus() != null ? b.getStatus().name() : null);
                dto.setPaymentStatus(b.getPaymentStatus());
            }
        }

        return dto;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getInvoiceSummary() {
        var cb = entityManager.getCriteriaBuilder();
        var cq = cb.createQuery(Object[].class);
        var root = cq.from(BookingInvoice.class);
        cq.multiselect(
            cb.coalesce(cb.sum(root.<BigDecimal>get("totalOriginalAmount")), BigDecimal.ZERO),
            cb.coalesce(cb.sum(root.<BigDecimal>get("totalActualRevenue")), BigDecimal.ZERO),
            cb.coalesce(cb.sum(root.<BigDecimal>get("totalRefundToCustomer")), BigDecimal.ZERO),
            cb.coalesce(cb.sum(root.<BigDecimal>get("totalAdditionalCharge")), BigDecimal.ZERO),
            cb.coalesce(cb.sum(root.<BigDecimal>get("remainingBalance")), BigDecimal.ZERO),
            cb.count(root),
            cb.sum(cb.<Long>selectCase()
                .when(cb.and(
                    cb.greaterThan(cb.coalesce(root.<BigDecimal>get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                    cb.equal(cb.coalesce(root.<BigDecimal>get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO),
                    cb.equal(cb.coalesce(root.<BigDecimal>get("totalRefundToCustomer"), BigDecimal.ZERO), BigDecimal.ZERO)
                ), 1L)
                .otherwise(0L)),
            cb.sum(cb.<Long>selectCase()
                .when(cb.or(
                    cb.isNull(root.get("totalAllocatedPaidAmount")),
                    cb.equal(root.<BigDecimal>get("totalAllocatedPaidAmount"), BigDecimal.ZERO)
                ), 1L)
                .otherwise(0L)),
            cb.sum(cb.<Long>selectCase()
                .when(cb.and(
                    cb.greaterThan(cb.coalesce(root.<BigDecimal>get("totalAllocatedPaidAmount"), BigDecimal.ZERO), BigDecimal.ZERO),
                    cb.greaterThan(cb.coalesce(root.<BigDecimal>get("remainingBalance"), BigDecimal.ZERO), BigDecimal.ZERO)
                ), 1L)
                .otherwise(0L)),
            cb.sum(cb.<Long>selectCase()
                .when(cb.greaterThan(cb.coalesce(root.<BigDecimal>get("totalRefundToCustomer"), BigDecimal.ZERO), BigDecimal.ZERO), 1L)
                .otherwise(0L))
        );
        Object[] res = entityManager.createQuery(cq).getSingleResult();
        BigDecimal grossInvoiceAmount = (BigDecimal) res[0];
        BigDecimal totalActualRevenue = (BigDecimal) res[1];
        BigDecimal totalRefundedAmount = (BigDecimal) res[2];
        BigDecimal totalAdditionalCharge = (BigDecimal) res[3];
        BigDecimal totalRemainingToPay = (BigDecimal) res[4];
        Long totalInvoices = ((Number) res[5]).longValue();
        Long paidInvoiceCount = res[6] != null ? ((Number) res[6]).longValue() : 0L;
        Long unpaidInvoiceCount = res[7] != null ? ((Number) res[7]).longValue() : 0L;
        Long partiallyPaidInvoiceCount = res[8] != null ? ((Number) res[8]).longValue() : 0L;
        Long refundedInvoiceCount = res[9] != null ? ((Number) res[9]).longValue() : 0L;

        var now = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).toLocalDate();
        var todayStart = now.atStartOfDay();
        var tomorrowStart = now.plusDays(1).atStartOfDay();

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
        out.put("totalInvoices", totalInvoices);
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
        out.put("pendingRefundCount", pendingCount);
        return out;
    }
}
