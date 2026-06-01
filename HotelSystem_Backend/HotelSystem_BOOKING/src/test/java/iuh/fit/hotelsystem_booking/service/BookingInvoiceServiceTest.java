package iuh.fit.hotelsystem_booking.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.cqrs.event.CqrsOutboxEventService;
import iuh.fit.hotelsystem_booking.entity.BookingInvoice;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingStayRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingInvoiceServiceTest {

    @Test
    void mergeCheckoutInvoiceKeepsExistingRoomAndAddsOnlyNewRoom() throws Exception {
        BookingInvoiceRepository invoiceRepository = mock(BookingInvoiceRepository.class);
        InvoiceStatusResolver invoiceStatusResolver = mock(InvoiceStatusResolver.class);
        ObjectMapper objectMapper = new ObjectMapper();

        BookingInvoice existing = new BookingInvoice();
        existing.setId(7L);
        existing.setBookingId(10L);
        existing.setCurrency("VND");
        existing.setLinesJson(objectMapper.writeValueAsString(Map.of(
                "invoiceItems", List.of(Map.of(
                        "bookingRoomId", 1L,
                        "itemType", "ROOM_CHARGE",
                        "category", "ROOM",
                        "amount", 1_000_000)),
                "roomSummaries", List.of(Map.of(
                        "bookingRoomId", 1L,
                        "roomCharge", 1_000_000,
                        "actualRoomRevenue", 1_000_000,
                        "allocatedPaidAmount", 1_000_000)))));

        when(invoiceRepository.findLatestByBookingIdForUpdate(10L)).thenReturn(Optional.of(existing));
        when(invoiceRepository.saveAndFlush(any(BookingInvoice.class))).thenAnswer(inv -> inv.getArgument(0));
        when(invoiceStatusResolver.resolve(10L)).thenReturn("PARTIAL");

        BookingInvoiceService service = new BookingInvoiceService(
                invoiceRepository,
                mock(BookingRepository.class),
                mock(BookingStayRepository.class),
                mock(BookingGuestService.class),
                mock(RefundTransactionRepository.class),
                objectMapper,
                null,
                mock(CqrsOutboxEventService.class));
        service.setInvoiceStatusResolver(invoiceStatusResolver);

        BookingInvoice merged = service.mergeCheckoutInvoice(10L, BigDecimal.valueOf(2_000_000), "VND", Map.of(
                "invoiceItems", List.of(
                        Map.of("bookingRoomId", 1L, "itemType", "ROOM_CHARGE", "category", "ROOM", "amount", 1_000_000),
                        Map.of("bookingRoomId", 2L, "itemType", "ROOM_CHARGE", "category", "ROOM", "amount", 1_500_000)),
                "roomSummaries", List.of(
                        Map.of("bookingRoomId", 1L, "roomCharge", 1_000_000, "actualRoomRevenue", 1_000_000, "allocatedPaidAmount", 1_000_000),
                        Map.of("bookingRoomId", 2L, "roomCharge", 1_500_000, "actualRoomRevenue", 1_500_000, "allocatedPaidAmount", 1_500_000))));

        Map<?, ?> lines = objectMapper.readValue(merged.getLinesJson(), Map.class);
        List<?> invoiceItems = (List<?>) lines.get("invoiceItems");
        List<?> roomSummaries = (List<?>) lines.get("roomSummaries");

        assertEquals(2, invoiceItems.size());
        assertEquals(2, roomSummaries.size());
        assertEquals("PARTIAL", merged.getInvoiceStatus());
        assertEquals(0, BigDecimal.valueOf(2_500_000).compareTo(merged.getAmount()));
        assertTrue(merged.getLinesJson().contains("\"bookingRoomId\":2"));
        verify(invoiceRepository).saveAndFlush(existing);
    }
}
