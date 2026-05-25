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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
    public BookingInvoice saveCheckoutInvoice(Long bookingId, BigDecimal amount, String currency, Map<String, Object> lines) {
        try {
            BookingInvoice invoice = new BookingInvoice();
            invoice.setBookingId(bookingId);
            invoice.setAmount(amount != null ? amount : BigDecimal.ZERO);
            invoice.setCurrency(currency != null ? currency : "VND");
            invoice.setLinesJson(objectMapper.writeValueAsString(lines != null ? lines : Map.of()));
            invoice.setCreatedAt(LocalDateTime.now());
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
        List<BookingInvoiceDto> result = new ArrayList<>();
        for (BookingInvoice invoice : invoiceRepository.findAllByOrderByCreatedAtDesc()) {
            result.add(toDto(invoice));
        }
        return result;
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
        dto.setTotalRooms(booking.getTotalRooms() != null ? booking.getTotalRooms() : (booking.getItems() != null ? booking.getItems().size() : null));

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

        RefundTransaction refund = refundTransactionRepository.findFirstByBookingIdAndReasonOrderByCreatedAtDesc(dto.getBookingId(), "EARLY_CHECKOUT_REFUND")
                .orElseGet(() -> refundTransactionRepository.findFirstByBookingId(dto.getBookingId()).orElse(null));
        if (refund != null) {
            dto.setRefundTransactionId(refund.getId());
            dto.setRefundStatus(refund.getStatus() != null ? refund.getStatus().name() : null);
            dto.setRefundSettlementAmount(refund.getRefundAmount() != null ? BigDecimal.valueOf(refund.getRefundAmount()) : null);
        }
    }

    private void applyStay(BookingInvoiceDto dto, BookingStay stay) {
        dto.setCheckinStaffId(stay.getCheckedInByStaffId() != null ? String.valueOf(stay.getCheckedInByStaffId()) : null);
        dto.setCheckoutStaffId(stay.getCheckedOutByStaffId() != null ? String.valueOf(stay.getCheckedOutByStaffId()) : null);
        dto.setCheckedInAt(stay.getActualCheckInAt());
        dto.setCheckedOutAt(stay.getActualCheckOutAt());
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
            if (guest == null) continue;
            if (first == null) first = guest;
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
