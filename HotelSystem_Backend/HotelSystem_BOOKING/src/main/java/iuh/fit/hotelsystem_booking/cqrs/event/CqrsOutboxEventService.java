package iuh.fit.hotelsystem_booking.cqrs.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class CqrsOutboxEventService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public CqrsOutboxEventService(OutboxEventRepository outboxEventRepository, ObjectMapper objectMapper) {
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    public void enqueueBookingChanged(Long bookingId) {
        CqrsProjectionEvent event = base(CqrsProjectionEventType.BOOKING_CHANGED);
        event.setBookingId(bookingId);
        enqueue("Booking", bookingId, CqrsProjectionEventType.BOOKING_CHANGED, event);
    }

    public void enqueueInvoiceChanged(Long bookingId, Long invoiceId) {
        CqrsProjectionEvent event = base(CqrsProjectionEventType.INVOICE_CHANGED);
        event.setBookingId(bookingId);
        event.setInvoiceId(invoiceId);
        enqueue("BookingInvoice", invoiceId, CqrsProjectionEventType.INVOICE_CHANGED, event);
    }

    public void enqueueRefundChanged(Long bookingId, Long refundId) {
        CqrsProjectionEvent event = base(CqrsProjectionEventType.REFUND_CHANGED);
        event.setBookingId(bookingId);
        event.setRefundId(refundId);
        enqueue("RefundTransaction", refundId, CqrsProjectionEventType.REFUND_CHANGED, event);
    }

    private CqrsProjectionEvent base(String eventType) {
        CqrsProjectionEvent event = new CqrsProjectionEvent();
        event.setEventType(eventType);
        event.setOccurredAt(LocalDateTime.now());
        return event;
    }

    private void enqueue(String aggregateType, Long aggregateId, String type, CqrsProjectionEvent payload) {
        if (aggregateId == null) {
            return;
        }
        try {
            OutboxEvent outbox = new OutboxEvent();
            outbox.setAggregateType(aggregateType);
            outbox.setAggregateId(String.valueOf(aggregateId));
            outbox.setType(type);
            outbox.setPayload(objectMapper.writeValueAsString(payload));
            String correlation = MDC.get("X-Correlation-Id");
            if (correlation != null && !correlation.isBlank()) {
                Map<String, Object> headers = new HashMap<>();
                headers.put("X-Correlation-Id", correlation);
                outbox.setHeaders(headers);
            }
            outboxEventRepository.save(outbox);
        } catch (Exception ex) {
            throw new IllegalStateException("Could not enqueue CQRS outbox event: " + type, ex);
        }
    }
}
