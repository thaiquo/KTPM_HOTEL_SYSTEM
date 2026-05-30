package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.client.RoomServiceClient;
import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.dto.BookingCheckoutPreviewResponse;
import iuh.fit.hotelsystem_booking.dto.BookingInvoiceDto;
import iuh.fit.hotelsystem_booking.dto.BookingRoomBatchRequest;
import iuh.fit.hotelsystem_booking.dto.BookingRoomExtraFeeRequest;
import iuh.fit.hotelsystem_booking.dto.CheckoutInvoiceLineDto;
import iuh.fit.hotelsystem_booking.dto.CheckoutRoomSummaryDto;
import iuh.fit.hotelsystem_booking.dto.EarlyCheckoutRefundResult;
import iuh.fit.hotelsystem_booking.dto.ServiceLineDto;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingServiceLine;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingServiceLineRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class BookingCheckoutBillingService {

    private static final Logger log = LoggerFactory.getLogger(BookingCheckoutBillingService.class);

    private final BookingRepository bookingRepository;
    private final BookingServiceLineRepository bookingServiceLineRepository;
    private final BookingInvoiceService bookingInvoiceService;
    private final RefundCalculationService refundCalculationService;
    private final CheckInOutService checkInOutService;
    private final RoomServiceClient roomServiceClient;
    private final Clock clock;

    public BookingCheckoutBillingService(BookingRepository bookingRepository,
                                         BookingServiceLineRepository bookingServiceLineRepository,
                                         BookingInvoiceService bookingInvoiceService,
                                         RefundCalculationService refundCalculationService,
                                         CheckInOutService checkInOutService,
                                         RoomServiceClient roomServiceClient,
                                         Clock clock) {
        this.bookingRepository = bookingRepository;
        this.bookingServiceLineRepository = bookingServiceLineRepository;
        this.bookingInvoiceService = bookingInvoiceService;
        this.refundCalculationService = refundCalculationService;
        this.checkInOutService = checkInOutService;
        this.roomServiceClient = roomServiceClient;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public BookingCheckoutPreviewResponse previewCheckout(Long bookingId, BookingRoomBatchRequest request) {
        CheckoutSnapshot snapshot = buildSnapshot(bookingId, request);
        return toResponse(snapshot, true);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> buildInvoicePayload(Long bookingId, BookingRoomBatchRequest request) {
        CheckoutSnapshot snapshot = buildSnapshot(bookingId, request);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("bookingId", snapshot.booking.getId());
        payload.put("bookingCode", snapshot.booking.getBookingCode());
        payload.put("bookingStatus", snapshot.booking.getStatus() != null ? snapshot.booking.getStatus().name() : null);
        payload.put("selectedRoomIds", snapshot.selectedRoomIds);
        payload.put("invoiceItems", snapshot.invoiceLines);
        payload.put("roomSummaries", snapshot.roomSummaries);
        payload.put("totalOriginalAmount", snapshot.totalOriginalAmount);
        payload.put("totalUsedRoomAmount", snapshot.totalUsedRoomAmount);
        payload.put("totalUnusedRoomAmount", snapshot.totalUnusedRoomAmount);
        payload.put("totalHotelKeepAmount", snapshot.totalHotelKeepAmount);
        payload.put("totalAllocatedPaidAmount", snapshot.totalAllocatedPaidAmount);
        payload.put("totalActualRevenue", snapshot.totalActualRevenue);
        payload.put("totalRefundToCustomer", snapshot.totalRefundToCustomer);
        payload.put("totalAdditionalCharge", snapshot.totalAdditionalCharge);
        payload.put("roomCharge", snapshot.roomCharge);
        payload.put("serviceTotal", snapshot.serviceTotal);
        payload.put("bookingServiceTotal", snapshot.bookingServiceTotal);
        payload.put("draftServiceLinesTotal", snapshot.draftServiceLinesTotal);
        payload.put("roomServiceFeeTotal", snapshot.manualServiceTotal);
        payload.put("manualServiceTotal", snapshot.manualServiceTotal);
        payload.put("damageFeeTotal", snapshot.damageFeeTotal);
        payload.put("manualSurchargeTotal", snapshot.manualSurchargeTotal);
        payload.put("lateCheckoutFeeTotal", snapshot.lateCheckoutFeeTotal);
        payload.put("earlyCheckinFeeTotal", snapshot.earlyCheckinFeeTotal);
        payload.put("earlyCheckoutRefund", snapshot.earlyCheckoutRefund);
        payload.put("actualRoomCharge", snapshot.actualRoomCharge);
        payload.put("grandTotal", snapshot.grandTotal);
        payload.put("amountPaid", snapshot.amountPaid);
        payload.put("paidAmount", snapshot.amountPaid);
        payload.put("totalPaidAmount", snapshot.amountPaid);
        payload.put("totalAmount", snapshot.grandTotal);
        payload.put("remainingBalance", snapshot.remainingBalance);
        payload.put("remainingRoomAmount", snapshot.remainingBalance);
        payload.put("refundSettlementAmount", snapshot.refundSettlementAmount);
        payload.put("paymentRequired", snapshot.paymentRequired);
        payload.put("refundRequired", snapshot.refundRequired);
        payload.put("checkoutType", snapshot.checkoutType);
        payload.put("invoiceStatus", resolveInvoiceStatus(snapshot.booking));
        payload.put("paymentStatus", resolvePaymentStatus(snapshot));
        if (request != null && request.getStaffId() != null) {
            payload.put("processedByStaffId", request.getStaffId());
            payload.put("checkoutStaffId", request.getStaffId());
        }
        payload.put("generatedAt", LocalDateTime.now(clock));
        return payload;
    }

    private BookingCheckoutPreviewResponse toResponse(CheckoutSnapshot snapshot, boolean preview) {
        BookingCheckoutPreviewResponse response = new BookingCheckoutPreviewResponse();
        response.setBookingId(snapshot.booking.getId());
        response.setBookingCode(snapshot.booking.getBookingCode());
        response.setBookingStatus(snapshot.booking.getStatus() != null ? snapshot.booking.getStatus().name() : null);
        response.setCurrency(snapshot.booking.getCurrency() != null ? snapshot.booking.getCurrency() : "VND");
        response.setActualCheckOutAt(snapshot.actualCheckOutAt);
        response.setSelectedRoomCount(snapshot.selectedRoomIds.size());
        response.setSelectedRoomIds(snapshot.selectedRoomIds);
        response.setRoomSummaries(snapshot.roomSummaries);
        response.setInvoiceLines(snapshot.invoiceLines);
        response.setTotalOriginalAmount(snapshot.totalOriginalAmount);
        response.setTotalUsedRoomAmount(snapshot.totalUsedRoomAmount);
        response.setTotalUnusedRoomAmount(snapshot.totalUnusedRoomAmount);
        response.setTotalHotelKeepAmount(snapshot.totalHotelKeepAmount);
        response.setTotalAllocatedPaidAmount(snapshot.totalAllocatedPaidAmount);
        response.setTotalActualRevenue(snapshot.totalActualRevenue);
        response.setTotalRefundToCustomer(snapshot.totalRefundToCustomer);
        response.setTotalAdditionalCharge(snapshot.totalAdditionalCharge);
        response.setRoomCharge(snapshot.roomCharge);
        response.setServiceTotal(snapshot.serviceTotal);
        response.setBookingServiceTotal(snapshot.bookingServiceTotal);
        response.setDraftServiceLinesTotal(snapshot.draftServiceLinesTotal);
        response.setRoomServiceFeeTotal(snapshot.manualServiceTotal);
        response.setManualServiceTotal(snapshot.manualServiceTotal);
        response.setDamageFeeTotal(snapshot.damageFeeTotal);
        response.setManualSurchargeTotal(snapshot.manualSurchargeTotal);
        response.setLateCheckoutFeeTotal(snapshot.lateCheckoutFeeTotal);
        response.setEarlyCheckinFeeTotal(snapshot.earlyCheckinFeeTotal);
        response.setEarlyCheckoutRefund(snapshot.earlyCheckoutRefund);
        response.setActualRoomCharge(snapshot.actualRoomCharge);
        response.setGrandTotal(snapshot.grandTotal);
        response.setAmountPaid(snapshot.amountPaid);
        response.setRemainingBalance(snapshot.remainingBalance);
        response.setRefundSettlementAmount(snapshot.refundSettlementAmount);
        response.setPaymentRequired(snapshot.paymentRequired);
        response.setRefundRequired(snapshot.refundRequired);
        response.setCheckoutType(snapshot.checkoutType);
        response.setUsedNights(snapshot.usedNights);
        response.setUnusedNights(snapshot.unusedNights);
        response.setRefundRate(snapshot.refundRate);
        response.setMessage(buildMessage(snapshot, preview));
        return response;
    }

    private String buildMessage(CheckoutSnapshot snapshot, boolean preview) {
        if (snapshot.paymentRequired) {
            return "Cần thu thêm trước khi hoàn tất checkout.";
        }
        if (snapshot.refundRequired) {
            return preview ? "Preview checkout có hoàn tiền." : "Checkout sẽ tạo khoản hoàn tiền.";
        }
        return preview ? "Preview checkout thành công." : "Checkout calculated successfully.";
    }

    private CheckoutSnapshot buildSnapshot(Long bookingId, BookingRoomBatchRequest request) {
        Booking booking = bookingRepository.findByIdWithItems(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found: " + bookingId));

        Map<Long, BookingRoomExtraFeeRequest> feeByRoom = request != null && request.getExtraFees() != null
                ? request.getExtraFees().stream()
                    .filter(line -> line != null && line.getBookingRoomId() != null)
                    .collect(java.util.stream.Collectors.toMap(
                        BookingRoomExtraFeeRequest::getBookingRoomId,
                        line -> line,
                        (left, right) -> right,
                        LinkedHashMap::new))
                : Map.of();

        List<Long> selectedRoomIds = request != null && request.getBookingRoomIds() != null
                ? request.getBookingRoomIds().stream().filter(Objects::nonNull).distinct().toList()
                : List.of();

        Map<Long, BookingItem> itemById = new LinkedHashMap<>();
        if (booking.getItems() != null) {
            for (BookingItem item : booking.getItems()) {
                if (item != null && item.getId() != null) {
                    itemById.put(item.getId(), item);
                }
            }
        }

        List<BookingItem> invoiceRooms = new ArrayList<>();
        if (selectedRoomIds.isEmpty()) {
            for (BookingItem item : itemById.values()) {
                if (item.getStatus() == BookingItemStatus.CHECKED_OUT) {
                    invoiceRooms.add(item);
                }
            }
        } else {
            for (Long roomId : selectedRoomIds) {
                BookingItem item = itemById.get(roomId);
                if (item != null) invoiceRooms.add(item);
            }
        }

        LocalDateTime actualCheckOutAt = LocalDateTime.now(clock);
        EarlyCheckoutRefundResult earlyCheckout = calculateEarlyCheckoutResult(booking, actualCheckOutAt);

        // ── Tính booking original total (sum tất cả phòng) để dùng phân bổ tỷ lệ ──
        BigDecimal bookingOriginalTotal = BigDecimal.ZERO;
        if (booking.getItems() != null) {
            for (BookingItem item : booking.getItems()) {
                if (item != null && item.getStatus() != BookingItemStatus.CANCELLED) {
                    bookingOriginalTotal = bookingOriginalTotal.add(calculateRoomCharge(item));
                }
            }
        }
        if (bookingOriginalTotal.compareTo(BigDecimal.ZERO) == 0) {
            bookingOriginalTotal = money(booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice());
        }

        // ── QUAN TRỌNG: Tính originalPaidAmount từ finalTotal/depositAmount ──
        // KHÔNG dùng booking.getPaidAmount() vì field này bị mutate sau checkout/refund.
        BigDecimal originalPaidAmount = resolveOriginalPaidAmount(booking, bookingOriginalTotal);

        // Log debug để trace:
        log.info("[PAID_ALLOC_DEBUG] bookingId={} | bookingOriginalTotal={} | paidAmount(raw)={} | depositAmount={} | paymentType={} | originalPaidAmount(fixed)={}",
            bookingId, bookingOriginalTotal, booking.getPaidAmount(), booking.getDepositAmount(),
            booking.getPaymentType(), originalPaidAmount);

        BigDecimal bookingPaidRatio = bookingOriginalTotal.compareTo(BigDecimal.ZERO) > 0
            ? originalPaidAmount.divide(bookingOriginalTotal, 8, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        // ── EarlyCheckout refund rate ──
        BigDecimal refundRate = earlyCheckout.isEarlyCheckout() && earlyCheckout.getRefundRate() != null
                ? earlyCheckout.getRefundRate()
                : BigDecimal.valueOf(BookingConstants.EARLY_CHECKOUT_REFUND_RATE);
        int bookingTotalNights = earlyCheckout.getTotalNights() > 0 ? earlyCheckout.getTotalNights() : 0;
        int bookingUsedNights = earlyCheckout.isEarlyCheckout() ? Math.max(1, earlyCheckout.getUsedNights()) : bookingTotalNights;
        int bookingUnusedNights = earlyCheckout.isEarlyCheckout() ? Math.max(0, earlyCheckout.getUnusedNights()) : 0;

        // ── Lấy danh sách refund line đã lưu trước đó để tránh duplicate ──
        BigDecimal alreadyRefunded = resolveAlreadyRecordedEarlyCheckoutRefund(bookingId);

        List<CheckoutRoomSummaryDto> roomSummaries = new ArrayList<>();
        List<CheckoutInvoiceLineDto> invoiceLines = new ArrayList<>();

        BigDecimal roomChargeTotal = BigDecimal.ZERO;
        BigDecimal totalUsedRoomAmount = BigDecimal.ZERO;
        BigDecimal totalUnusedRoomAmount = BigDecimal.ZERO;
        BigDecimal totalHotelKeepAmount = BigDecimal.ZERO;
        BigDecimal totalAllocatedPaidAmount = BigDecimal.ZERO;
        BigDecimal totalActualRevenue = BigDecimal.ZERO;
        BigDecimal totalRefundToCustomer = BigDecimal.ZERO;
        BigDecimal totalAdditionalCharge = BigDecimal.ZERO;
        BigDecimal totalEarlyRefundThisCheckout = BigDecimal.ZERO;
        BigDecimal draftServiceLinesTotal = BigDecimal.ZERO;
        BigDecimal manualServiceTotal = BigDecimal.ZERO;
        BigDecimal damageFeeTotal = BigDecimal.ZERO;
        BigDecimal manualSurchargeTotal = BigDecimal.ZERO;
        BigDecimal lateCheckoutFeeTotal = BigDecimal.ZERO;
        BigDecimal earlyCheckinFeeTotal = BigDecimal.ZERO;

        for (BookingItem room : invoiceRooms) {
            BookingRoomExtraFeeRequest extraFee = feeByRoom.get(room.getId());
            boolean currentBatchRoom = selectedRoomIds.contains(room.getId());
            boolean alreadyCheckedOut = room.getStatus() == BookingItemStatus.CHECKED_OUT && !currentBatchRoom;
            BigDecimal roomCharge = alreadyCheckedOut && room.getRoomCharge() != null ? room.getRoomCharge() : calculateRoomCharge(room);
            BigDecimal serviceCharge = alreadyCheckedOut ? money(room.getServiceCharge()) : money(extraFee != null ? extraFee.getServiceCharge() : null);
            BigDecimal damageFee = alreadyCheckedOut ? money(room.getDamageFee()) : money(extraFee != null ? extraFee.getDamageFee() : null);
            BigDecimal manualSurcharge = alreadyCheckedOut ? BigDecimal.ZERO : money(extraFee != null ? extraFee.getSurcharge() : null);
            BigDecimal lateCheckoutFee = alreadyCheckedOut ? money(room.getSurcharge()) : calculateLateCheckoutFee(room, actualCheckOutAt);
            BigDecimal roomTotal = roomCharge.add(serviceCharge).add(damageFee).add(manualSurcharge).add(lateCheckoutFee);

            roomChargeTotal = roomChargeTotal.add(roomCharge);
            manualServiceTotal = manualServiceTotal.add(serviceCharge);
            damageFeeTotal = damageFeeTotal.add(damageFee);
            manualSurchargeTotal = manualSurchargeTotal.add(manualSurcharge);
            lateCheckoutFeeTotal = lateCheckoutFeeTotal.add(lateCheckoutFee);

            // ── Per-room early checkout refund ────────────────────────────────────
            // Tính số đêm chưa dùng của phòng này
            int roomTotalNights = resolveRoomTotalNights(room, booking);
            int roomUsedNights = alreadyCheckedOut ? roomTotalNights
                    : Math.min(Math.max(1, bookingUsedNights), roomTotalNights);
            int roomUnusedNights = Math.max(0, roomTotalNights - roomUsedNights);
            
            // Lấy chính xác giá các đêm chưa dùng từ roomNightLinesJson
            BigDecimal unusedNightAmount = BigDecimal.ZERO;
            if (room.getRoomNightLinesJson() != null && !room.getRoomNightLinesJson().isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(room.getRoomNightLinesJson());
                    for (int i = 0; i < root.size(); i++) {
                        BigDecimal p = BigDecimal.valueOf(root.get(i).get("price").asDouble());
                        if (i >= roomUsedNights) unusedNightAmount = unusedNightAmount.add(p);
                    }
                } catch (Exception e) {}
            }
            if (unusedNightAmount.compareTo(BigDecimal.ZERO) == 0 && roomUnusedNights > 0) {
                // Fallback nếu JSON lỗi hoặc không có, lấy giá chia đều
                if (roomTotalNights > 0) {
                    BigDecimal avgNightly = roomCharge.divide(BigDecimal.valueOf(roomTotalNights), 2, RoundingMode.HALF_UP);
                    unusedNightAmount = avgNightly.multiply(BigDecimal.valueOf(roomUnusedNights)).setScale(0, RoundingMode.HALF_UP);
                }
            }
            
            if (unusedNightAmount.compareTo(roomCharge) > 0) {
                unusedNightAmount = roomCharge;
            }
            BigDecimal usedNightAmount = roomCharge.subtract(unusedNightAmount).max(BigDecimal.ZERO);
            
            // Tính hoàn sớm (80% của đêm chưa dùng) và penalty (20% của đêm chưa dùng)
            BigDecimal roomEarlyRefund = BigDecimal.ZERO;
            BigDecimal hotelPenaltyAmount = BigDecimal.ZERO;
            if (!alreadyCheckedOut && earlyCheckout.isEarlyCheckout() && roomUnusedNights > 0
                    && !booking.isNonRefundable()) {
                roomEarlyRefund = unusedNightAmount.multiply(refundRate).setScale(0, RoundingMode.HALF_UP);
                hotelPenaltyAmount = unusedNightAmount.subtract(roomEarlyRefund); // phần dư ra sau khi hoàn (20%)
            }

                BigDecimal actualRoomRevenue = roomCharge.subtract(roomEarlyRefund).max(BigDecimal.ZERO);
            
                // Tính early checkin fee
            BigDecimal earlyCheckinFee = BigDecimal.valueOf(checkInOutService.calculateEarlyCheckInFee(room)).setScale(0, RoundingMode.HALF_UP);
            roomTotal = roomTotal.add(earlyCheckinFee);
            earlyCheckinFeeTotal = earlyCheckinFeeTotal.add(earlyCheckinFee);

                // ── Phân bổ tiền đã thanh toán theo giá trị gốc của phòng ──
                BigDecimal paidAllocated = allocatePaidAmount(originalPaidAmount, roomCharge, bookingOriginalTotal);

                // ── Net settlement cho phòng này ──
                BigDecimal roomExtraCharges = serviceCharge.add(damageFee).add(manualSurcharge).add(lateCheckoutFee).add(earlyCheckinFee);
                BigDecimal roomGrandTotal = actualRoomRevenue.add(roomExtraCharges);
                BigDecimal refundToCustomer = paidAllocated.subtract(roomGrandTotal).max(BigDecimal.ZERO);
                BigDecimal additionalChargeForRoom = roomGrandTotal.subtract(paidAllocated).max(BigDecimal.ZERO);
                BigDecimal netRefundForRoom = refundToCustomer.subtract(additionalChargeForRoom);

            totalEarlyRefundThisCheckout = totalEarlyRefundThisCheckout.add(roomEarlyRefund);
                totalUsedRoomAmount = totalUsedRoomAmount.add(usedNightAmount);
                totalUnusedRoomAmount = totalUnusedRoomAmount.add(unusedNightAmount);
                totalHotelKeepAmount = totalHotelKeepAmount.add(hotelPenaltyAmount);
                totalAllocatedPaidAmount = totalAllocatedPaidAmount.add(paidAllocated);
                totalActualRevenue = totalActualRevenue.add(actualRoomRevenue);
                totalRefundToCustomer = totalRefundToCustomer.add(refundToCustomer);
                totalAdditionalCharge = totalAdditionalCharge.add(additionalChargeForRoom);

            CheckoutRoomSummaryDto roomSummary = new CheckoutRoomSummaryDto();
            roomSummary.setBookingRoomId(room.getId());
            roomSummary.setRoomId(room.getRoomId());
            roomSummary.setRoomNumber(resolveRoomNumber(room.getRoomId()));
            roomSummary.setRoomTypeName(resolveRoomTypeName(room.getRoomId()));
                roomSummary.setRoomOriginalAmount(roomCharge);
            roomSummary.setRoomCharge(roomCharge);
                roomSummary.setUsedRoomAmount(usedNightAmount);
                roomSummary.setUnusedRoomAmount(unusedNightAmount);
                roomSummary.setHotelKeepAmount(hotelPenaltyAmount);
                roomSummary.setAllocatedPaidAmount(paidAllocated);
                roomSummary.setActualRoomRevenue(actualRoomRevenue);
            roomSummary.setServiceCharge(serviceCharge);
            roomSummary.setDamageFee(damageFee);
            roomSummary.setManualSurcharge(manualSurcharge);
            roomSummary.setLateCheckoutFee(lateCheckoutFee);
            roomSummary.setTotalAmount(roomTotal);
            roomSummary.setCheckInDate(room.getCheckIn() != null ? room.getCheckIn().atStartOfDay() : null);
            roomSummary.setPlannedCheckOutDate(room.getCheckOut() != null ? room.getCheckOut().atStartOfDay() : null);
            roomSummary.setActualCheckOutAt(room.getActualCheckOutAt() != null ? room.getActualCheckOutAt() : actualCheckOutAt);
            roomSummary.setRoomStatus("CHECKED_OUT");
            // per-room settlement
            roomSummary.setEarlyCheckoutRefund(roomEarlyRefund);
            roomSummary.setExtraCharges(roomExtraCharges);
            roomSummary.setPaidAllocated(paidAllocated);
                roomSummary.setRefundToCustomer(refundToCustomer);
            roomSummary.setNetRefundForRoom(netRefundForRoom);
            roomSummary.setAdditionalChargeForRoom(additionalChargeForRoom);
            roomSummary.setUsedNightAmount(usedNightAmount);
            roomSummary.setUnusedNightAmount(unusedNightAmount);
            roomSummary.setHotelPenaltyAmount(hotelPenaltyAmount);
            roomSummary.setEarlyCheckinFee(earlyCheckinFee);
            roomSummaries.add(roomSummary);

            addLine(invoiceLines, room, "EARLY_CHECKIN_FEE", "FEE", "Phụ thu check-in sớm", earlyCheckinFee);
            addLine(invoiceLines, room, "SERVICE_CHARGE", "FEE", "Tiền dịch vụ", serviceCharge);
            addLine(invoiceLines, room, "DAMAGE_FEE", "FEE", "Phí hư hỏng", damageFee);
            addLine(invoiceLines, room, "MANUAL_SURCHARGE", "FEE", "Phí nhập tay", manualSurcharge);
            addLine(invoiceLines, room, "LATE_CHECKOUT_FEE", "FEE", "Phụ thu checkout trễ", lateCheckoutFee);
            
            // Bóc tách ghi nhận tiền phòng chi tiết
            if (earlyCheckout.isEarlyCheckout() && roomUnusedNights > 0 && roomEarlyRefund.compareTo(BigDecimal.ZERO) > 0) {
                addLine(invoiceLines, room, "ROOM_CHARGE_USED", "ROOM", "Tiền phòng (đã đổi/sử dụng)", usedNightAmount);
                addLine(invoiceLines, room, "ROOM_CHARGE_UNUSED", "ROOM", "Tiền phòng (chưa sử dụng)", unusedNightAmount);
                // Ghi nhận hoàn sớm riêng từng phòng vào invoice
                if (!alreadyCheckedOut) {
                    addLine(invoiceLines, room, "EARLY_CHECKOUT_REFUND", "ADJUSTMENT", "Hoàn 80% đêm chưa dùng", roomEarlyRefund.negate());
                    // 20% Penalty (chỉ ghi chú hiển thị, không cộng thêm vào grandTotal vì bản chất unusedNightAmount đã bao hàm cả 100%)
                    // Hoặc thực tế ta không cần ghi thêm một dòng phát sinh nào dương, vì (unused - HOÀN) chính là phần giữ lại!
                }
            } else {
                addLine(invoiceLines, room, "ROOM_CHARGE", "ROOM", "Tiền phòng", roomCharge);
            }
        }

        // Ghi trực tiếp refund của đợt checkout các phòng được chọn
        BigDecimal additionalRefund = totalEarlyRefundThisCheckout;

        BookingItem primaryRoom = invoiceRooms.isEmpty() ? null : invoiceRooms.get(0);

        List<ServiceLineDto> draftServiceLines = request != null && request.getServiceLines() != null
                ? request.getServiceLines()
                : Collections.emptyList();
        for (ServiceLineDto line : draftServiceLines) {
            if (line == null || line.getName() == null || line.getName().isBlank()) {
                continue;
            }
            int quantity = line.getQuantity() != null ? Math.max(1, line.getQuantity()) : 1;
            BigDecimal unitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal lineTotal = line.getLineTotal() != null ? line.getLineTotal() : unitPrice.multiply(BigDecimal.valueOf(quantity));
            if (lineTotal.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            draftServiceLinesTotal = draftServiceLinesTotal.add(lineTotal);
            CheckoutInvoiceLineDto dto = new CheckoutInvoiceLineDto();
            dto.setItemType("DRAFT_SERVICE_LINE");
            dto.setCategory("SERVICE");
            dto.setDescription(line.getName());
            dto.setQuantity(quantity);
            dto.setUnitPrice(unitPrice);
            dto.setAmount(lineTotal);
            if (primaryRoom != null) {
                dto.setBookingRoomId(primaryRoom.getId());
                dto.setRoomId(primaryRoom.getRoomId());
                dto.setRoomNumber(resolveRoomNumber(primaryRoom.getRoomId()));
                dto.setRoomTypeName(resolveRoomTypeName(primaryRoom.getRoomId()));
            }
            invoiceLines.add(dto);
        }

        List<BookingServiceLine> bookingServiceLines = bookingServiceLineRepository != null
                ? bookingServiceLineRepository.findByBookingId(bookingId)
                : Collections.emptyList();
        BigDecimal bookingServiceTotal = BigDecimal.ZERO;
        for (BookingServiceLine line : bookingServiceLines) {
            if (line == null || line.getLineTotal() == null) {
                continue;
            }
            bookingServiceTotal = bookingServiceTotal.add(line.getLineTotal());
            CheckoutInvoiceLineDto dto = new CheckoutInvoiceLineDto();
            dto.setItemType("BOOKING_SERVICE");
            dto.setCategory("SERVICE");
            dto.setDescription(line.getName());
            dto.setQuantity(line.getQuantity());
            dto.setUnitPrice(line.getUnitPrice());
            dto.setAmount(line.getLineTotal());
            if (primaryRoom != null) {
                dto.setBookingRoomId(primaryRoom.getId());
                dto.setRoomId(primaryRoom.getRoomId());
                dto.setRoomNumber(resolveRoomNumber(primaryRoom.getRoomId()));
                dto.setRoomTypeName(resolveRoomTypeName(primaryRoom.getRoomId()));
            }
            invoiceLines.add(dto);
        }

        BigDecimal serviceTotal = bookingServiceTotal.add(draftServiceLinesTotal);
        BigDecimal actualRoomCharge = totalActualRevenue;
        // grandTotal = tiền phòng thực thu của batch + các khoản phí phát sinh của batch
        BigDecimal grandTotal = actualRoomCharge
                .add(serviceTotal)
            .add(manualServiceTotal)
                .add(damageFeeTotal)
                .add(manualSurchargeTotal)
                .add(lateCheckoutFeeTotal)
                .add(earlyCheckinFeeTotal);
                
        BigDecimal remainingBalance = grandTotal.subtract(totalAllocatedPaidAmount);
        BigDecimal refundSettlementAmount = totalAllocatedPaidAmount.subtract(grandTotal).max(BigDecimal.ZERO);

        CheckoutSnapshot snapshot = new CheckoutSnapshot();
        snapshot.booking = booking;
        snapshot.selectedRoomIds = selectedRoomIds;
        snapshot.actualCheckOutAt = actualCheckOutAt;
        snapshot.roomSummaries = roomSummaries;
        snapshot.invoiceLines = invoiceLines;
        snapshot.totalOriginalAmount = roomChargeTotal;
        snapshot.totalUsedRoomAmount = totalUsedRoomAmount;
        snapshot.totalUnusedRoomAmount = totalUnusedRoomAmount;
        snapshot.totalHotelKeepAmount = totalHotelKeepAmount;
        snapshot.totalAllocatedPaidAmount = totalAllocatedPaidAmount;
        snapshot.totalActualRevenue = totalActualRevenue;
        snapshot.totalRefundToCustomer = totalRefundToCustomer;
        snapshot.totalAdditionalCharge = totalAdditionalCharge;
        snapshot.roomCharge = roomChargeTotal;
        snapshot.serviceTotal = serviceTotal;
        snapshot.bookingServiceTotal = bookingServiceTotal;
        snapshot.draftServiceLinesTotal = draftServiceLinesTotal;
        snapshot.manualServiceTotal = manualServiceTotal;
        snapshot.damageFeeTotal = damageFeeTotal;
        snapshot.manualSurchargeTotal = manualSurchargeTotal;
        snapshot.lateCheckoutFeeTotal = lateCheckoutFeeTotal;
        snapshot.earlyCheckinFeeTotal = earlyCheckinFeeTotal;
        snapshot.earlyCheckoutRefund = totalEarlyRefundThisCheckout;
        snapshot.actualRoomCharge = actualRoomCharge;
        snapshot.grandTotal = grandTotal;
        snapshot.amountPaid = totalAllocatedPaidAmount;
        snapshot.remainingBalance = remainingBalance;
        snapshot.refundSettlementAmount = refundSettlementAmount;
        snapshot.paymentRequired = remainingBalance.compareTo(BigDecimal.ZERO) > 0;
        snapshot.refundRequired = refundSettlementAmount.compareTo(BigDecimal.ZERO) > 0;
        snapshot.checkoutType = resolveCheckoutType(totalEarlyRefundThisCheckout, lateCheckoutFeeTotal);
        snapshot.usedNights = earlyCheckout.isEarlyCheckout() ? bookingUsedNights : null;
        snapshot.unusedNights = earlyCheckout.isEarlyCheckout() ? bookingUnusedNights : null;
        snapshot.refundRate = earlyCheckout.isEarlyCheckout() ? refundRate : BigDecimal.ZERO;
        return snapshot;

    }

    /** Tính số đêm của từng phòng (dựa trên item.checkIn/checkOut, fallback sang booking) */
    private int resolveRoomTotalNights(BookingItem room, Booking booking) {
        if (room.getNights() != null && room.getNights() > 0) return Math.max(1, room.getNights());
        LocalDateTime in = room.getCheckIn() != null ? room.getCheckIn().atStartOfDay()
                : (booking.getCheckIn() != null ? booking.getCheckIn().atStartOfDay() : null);
        LocalDateTime out = room.getCheckOut() != null ? room.getCheckOut().atStartOfDay()
                : (booking.getCheckOut() != null ? booking.getCheckOut().atStartOfDay() : null);
        if (in != null && out != null) {
            long days = ChronoUnit.DAYS.between(in, out);
            return (int) Math.max(1, days);
        }
        return 1;
    }

    private void addLine(List<CheckoutInvoiceLineDto> lines, BookingItem room, String type, String category, String description, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        CheckoutInvoiceLineDto dto = new CheckoutInvoiceLineDto();
        dto.setBookingRoomId(room.getId());
        dto.setRoomId(room.getRoomId());
        dto.setRoomNumber(resolveRoomNumber(room.getRoomId()));
        dto.setRoomTypeName(resolveRoomTypeName(room.getRoomId()));
        dto.setItemType(type);
        dto.setCategory(category);
        dto.setDescription(description);
        dto.setQuantity(1);
        dto.setUnitPrice(amount);
        dto.setAmount(amount);
        lines.add(dto);
    }

    private BigDecimal calculateRoomCharge(BookingItem room) {
        if (room.getRoomCharge() != null && room.getRoomCharge().compareTo(BigDecimal.ZERO) > 0) {
            return room.getRoomCharge().setScale(0, RoundingMode.HALF_UP);
        }
        if (room.getFinalAmount() != null && room.getFinalAmount().compareTo(BigDecimal.ZERO) > 0) {
            return room.getFinalAmount().setScale(0, RoundingMode.HALF_UP);
        }
        if (room.getFinalPrice() != null && room.getFinalPrice() > 0) {
            return BigDecimal.valueOf(room.getFinalPrice()).setScale(0, RoundingMode.HALF_UP);
        }
        
        // Fallback to json exact lines if available to sum original price
        if (room.getRoomNightLinesJson() != null && !room.getRoomNightLinesJson().isEmpty()) {
            try {
                BigDecimal sum = BigDecimal.ZERO;
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode root = mapper.readTree(room.getRoomNightLinesJson());
                for (int i = 0; i < root.size(); i++) {
                    sum = sum.add(BigDecimal.valueOf(root.get(i).get("price").asDouble()));
                }
                if (sum.compareTo(BigDecimal.ZERO) > 0) return sum.setScale(0, RoundingMode.HALF_UP);
            } catch (Exception e) {}
        }

        BigDecimal nightly = BigDecimal.valueOf(room.getPriceSnapshot() != null ? room.getPriceSnapshot() : 0.0);
        int nights = 1;
        if (room.getNights() != null) {
            nights = room.getNights();
        } else if (room.getCheckIn() != null && room.getCheckOut() != null) {
            nights = (int) Math.max(1, ChronoUnit.DAYS.between(room.getCheckIn(), room.getCheckOut()));
        }
        return nightly.multiply(BigDecimal.valueOf(Math.max(1, nights))).setScale(0, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateLateCheckoutFee(BookingItem room, LocalDateTime actualCheckoutAt) {
        if (room == null || actualCheckoutAt == null) {
            return BigDecimal.ZERO;
        }
        LocalDateTime oldActual = room.getActualCheckOutAt();
        room.setActualCheckOutAt(actualCheckoutAt);
        BigDecimal fee = BigDecimal.valueOf(checkInOutService.calculateLateCheckOutFee(room));
        room.setActualCheckOutAt(oldActual);
        return fee;
    }

    private BigDecimal calculateEarlyCheckoutRefund(Booking booking, LocalDateTime actualCheckoutAt) {
        if (booking == null || booking.getCheckOut() == null || actualCheckoutAt == null) {
            return BigDecimal.ZERO;
        }
        if (!actualCheckoutAt.toLocalDate().isBefore(booking.getCheckOut())) {
            return BigDecimal.ZERO;
        }
        try {
            return refundCalculationService.calculateEarlyCheckoutRefund(booking, null, actualCheckoutAt).getRefundAmount();
        } catch (Exception ex) {
            return BigDecimal.ZERO;
        }
    }

    private EarlyCheckoutRefundResult calculateEarlyCheckoutResult(Booking booking, LocalDateTime actualCheckoutAt) {
        try {
            return refundCalculationService.calculateEarlyCheckoutRefund(booking, null, actualCheckoutAt);
        } catch (Exception ex) {
            return new EarlyCheckoutRefundResult();
        }
    }

    private BigDecimal resolveAlreadyRecordedEarlyCheckoutRefund(Long bookingId) {
        if (bookingInvoiceService == null) {
            return BigDecimal.ZERO;
        }
        try {
            BookingInvoiceDto previous = bookingInvoiceService.findLatestInvoice(bookingId).orElse(null);
            if (previous != null && previous.getLines() instanceof Map<?, ?> lines) {
                return decimal(lines.get("earlyCheckoutAdjustment"), lines.get("totalEarlyCheckoutRefund"));
            }
        } catch (Exception ignored) {
            return BigDecimal.ZERO;
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

    private String resolveRoomNumber(Long roomId) {
        if (roomId == null || roomServiceClient == null) {
            return null;
        }
        try {
            iuh.fit.hotelsystem_booking.dto.Room room = roomServiceClient.getRoomById(roomId);
            return room != null ? room.getRoomNumber() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resolveRoomTypeName(Long roomId) {
        if (roomId == null || roomServiceClient == null) {
            return null;
        }
        try {
            iuh.fit.hotelsystem_booking.dto.Room room = roomServiceClient.getRoomById(roomId);
            return room != null && room.getRoomType() != null ? room.getRoomType().getType() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private BigDecimal money(Double value) {
        return BigDecimal.valueOf(value != null ? value : 0.0);
    }

    private BigDecimal money(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String resolveCheckoutType(BigDecimal refund, BigDecimal lateFee) {
        boolean early = refund != null && refund.compareTo(BigDecimal.ZERO) > 0;
        boolean late = lateFee != null && lateFee.compareTo(BigDecimal.ZERO) > 0;
        if (early && late) return "EARLY_AND_LATE";
        if (early) return "EARLY";
        if (late) return "LATE";
        return "NORMAL";
    }

    private String resolveInvoiceStatus(Booking booking) {
        if (booking == null || booking.getItems() == null || booking.getItems().isEmpty()) {
            return "DRAFT";
        }
        List<BookingItem> activeRooms = booking.getItems().stream()
                .filter(room -> room != null && room.getStatus() != BookingItemStatus.CANCELLED)
                .toList();
        if (activeRooms.isEmpty()) {
            return "CANCELLED";
        }
        if (activeRooms.stream().allMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT)) {
            return "COMPLETED";
        }
        if (activeRooms.stream().anyMatch(room -> room.getStatus() == BookingItemStatus.CHECKED_OUT)) {
            return "PARTIAL";
        }
        return "DRAFT";
    }

    private String resolvePaymentStatus(CheckoutSnapshot snapshot) {
        if (snapshot == null || snapshot.amountPaid == null || snapshot.amountPaid.compareTo(BigDecimal.ZERO) == 0) {
            return "UNPAID";
        }
        if (snapshot.refundRequired) {
            return "PENDING_REFUND";
        }
        if (snapshot.remainingBalance != null && snapshot.remainingBalance.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY_PAID";
        }
        return "PAID";
    }

    /**
     * Hàm dùng chung: phân bổ tiền đã thanh toán/cᵬ cho một phòng.
     * Công thức: originalPaidAmount * roomOriginalAmount / bookingOriginalTotal
     *
     * @param originalPaidAmount tiền khách đã thực sự bỏ vào (không bị mutate sau refund)
     * @param roomOriginalAmount tiền gốc của phòng này
     * @param bookingOriginalTotal tổng tiền gốc toàn booking
     * @return phần tiền phân bổ cho phòng này, làm tròn VND
     */
    private BigDecimal allocatePaidAmount(BigDecimal originalPaidAmount, BigDecimal roomOriginalAmount, BigDecimal bookingOriginalTotal) {
        if (bookingOriginalTotal == null || bookingOriginalTotal.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (originalPaidAmount == null || originalPaidAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (roomOriginalAmount == null || roomOriginalAmount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return originalPaidAmount
                .multiply(roomOriginalAmount)
                .divide(bookingOriginalTotal, 8, RoundingMode.HALF_UP)
                .setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Xác định số tiền khách đã thực sự thanh toán lúc booking thành công.
     *
     * QUAN TRỌNG — Root cause của bug:
     * depositAmount trong DB luôn được set = 50% finalTotal khi tạo booking,
     * bất kể khách trả full hay deposit (xem bookingPricing.ts dòng 347-348).
     * Đây chỉ là "số cọc tối thiểu yêu cầu", KHÔNG phải tiền thực sự đã trả.
     * Vì vậy KHÔNG dùng depositAmount để phán định FULL vs DEPOSIT!
     *
     * Logic đúng:
     * 1. paymentType = "FULL"    → originalPaid = finalTotal
     * 2. paymentType = "DEPOSIT" → originalPaid = paidAmount (tiền cọc thực tế)
     * 3. paidAmount >= 95% finalTotal → full payment → dùng finalTotal (immutable)
     * 4. paidAmount > 0 và < 95% finalTotal → deposit → dùng max(paidAmount, depositAmount)
     * 5. Fallback → dùng finalTotal (giả sử full)
     */
    private BigDecimal resolveOriginalPaidAmount(Booking booking, BigDecimal bookingOriginalTotal) {
        BigDecimal finalTotal = money(booking.getFinalTotal() != null ? booking.getFinalTotal() : booking.getTotalPrice());
        BigDecimal currentPaidAmount = money(booking.getPaidAmount());
        BigDecimal depositAmountField = money(booking.getDepositAmount());
        String paymentType = booking.getPaymentType();

        // Tham chiếu tổng: ưu tiên finalTotal, fallback bookingOriginalTotal
        BigDecimal refTotal = finalTotal.compareTo(BigDecimal.ZERO) > 0 ? finalTotal : bookingOriginalTotal;
        if (refTotal.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;

        // 1. paymentType rõ ràng là FULL → dùng refTotal
        if (paymentType != null && paymentType.toUpperCase().contains("FULL")) {
            log.info("[PAID_ALLOC] bookingId={} paymentType=FULL → originalPaid={}",
                booking.getId(), refTotal.min(bookingOriginalTotal));
            return refTotal.min(bookingOriginalTotal);
        }

        // 2. paymentType rõ ràng là DEPOSIT → dùng paidAmount thực tế (tiền cọc đã nộp)
        if (paymentType != null && paymentType.toUpperCase().contains("DEPOSIT")) {
            BigDecimal depositPaid = currentPaidAmount.compareTo(BigDecimal.ZERO) > 0
                    ? currentPaidAmount : depositAmountField;
            depositPaid = depositPaid.min(bookingOriginalTotal);
            log.info("[PAID_ALLOC] bookingId={} paymentType=DEPOSIT → originalPaid={}",
                booking.getId(), depositPaid);
            return depositPaid;
        }

        // 3. Dùng paidAmount để phán định khi paymentType không rõ
        if (currentPaidAmount.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal threshold95 = refTotal.multiply(BigDecimal.valueOf(0.95));
            if (currentPaidAmount.compareTo(threshold95) >= 0) {
                // paidAmount >= 95% finalTotal → full payment → dùng refTotal (immutable)
                log.info("[PAID_ALLOC] bookingId={} paidAmount({})>=95%*refTotal({}) → FULL → originalPaid={}",
                    booking.getId(), currentPaidAmount, refTotal, refTotal.min(bookingOriginalTotal));
                return refTotal.min(bookingOriginalTotal);
            } else {
                // paidAmount < 95% finalTotal → deposit → dùng max(paidAmount, depositField) để an toàn
                BigDecimal safePaid = currentPaidAmount.max(depositAmountField).min(bookingOriginalTotal);
                log.info("[PAID_ALLOC] bookingId={} paidAmount({}) < 95%*refTotal({}) → DEPOSIT → originalPaid={}",
                    booking.getId(), currentPaidAmount, refTotal, safePaid);
                return safePaid;
            }
        }

        // 4. Fallback: không có paidAmount → giả sử full payment
        log.info("[PAID_ALLOC] bookingId={} no paidAmount → Fallback → originalPaid={}",
            booking.getId(), refTotal.min(bookingOriginalTotal));
        return refTotal.min(bookingOriginalTotal);
    }

    private static class CheckoutSnapshot {
        private Booking booking;
        private List<Long> selectedRoomIds;
        private LocalDateTime actualCheckOutAt;
        private List<CheckoutRoomSummaryDto> roomSummaries;
        private List<CheckoutInvoiceLineDto> invoiceLines;
        private BigDecimal totalOriginalAmount;
        private BigDecimal totalUsedRoomAmount;
        private BigDecimal totalUnusedRoomAmount;
        private BigDecimal totalHotelKeepAmount;
        private BigDecimal totalAllocatedPaidAmount;
        private BigDecimal totalActualRevenue;
        private BigDecimal totalRefundToCustomer;
        private BigDecimal totalAdditionalCharge;
        private BigDecimal roomCharge;
        private BigDecimal serviceTotal;
        private BigDecimal bookingServiceTotal;
        private BigDecimal draftServiceLinesTotal;
        private BigDecimal manualServiceTotal;
        private BigDecimal damageFeeTotal;
        private BigDecimal manualSurchargeTotal;
        private BigDecimal lateCheckoutFeeTotal;
        private BigDecimal earlyCheckinFeeTotal;
        private BigDecimal earlyCheckoutRefund;
        private BigDecimal actualRoomCharge;
        private BigDecimal grandTotal;
        private BigDecimal amountPaid;
        private BigDecimal remainingBalance;
        private BigDecimal refundSettlementAmount;
        private boolean paymentRequired;
        private boolean refundRequired;
        private String checkoutType;
        private Integer usedNights;
        private Integer unusedNights;
        private BigDecimal refundRate;
    }
}
