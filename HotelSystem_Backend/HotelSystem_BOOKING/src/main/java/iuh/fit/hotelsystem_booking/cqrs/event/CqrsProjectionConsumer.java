package iuh.fit.hotelsystem_booking.cqrs.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.config.RabbitConfig;
import iuh.fit.hotelsystem_booking.cqrs.service.BookingReadModelProjector;
import iuh.fit.hotelsystem_booking.repository.BookingInvoiceRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class CqrsProjectionConsumer {

    private static final Logger log = LoggerFactory.getLogger(CqrsProjectionConsumer.class);

    private final BookingReadModelProjector projector;
    private final BookingRepository bookingRepository;
    private final BookingInvoiceRepository invoiceRepository;
    private final RefundTransactionRepository refundRepository;
    private final ObjectMapper objectMapper;

    public CqrsProjectionConsumer(BookingReadModelProjector projector,
                                  BookingRepository bookingRepository,
                                  BookingInvoiceRepository invoiceRepository,
                                  RefundTransactionRepository refundRepository,
                                  ObjectMapper objectMapper) {
        this.projector = projector;
        this.bookingRepository = bookingRepository;
        this.invoiceRepository = invoiceRepository;
        this.refundRepository = refundRepository;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitConfig.CQRS_PROJECTION_QUEUE)
    public void consume(String payload) {
        try {
            CqrsProjectionEvent event = objectMapper.readValue(payload, CqrsProjectionEvent.class);
            if (CqrsProjectionEventType.BOOKING_CHANGED.equals(event.getEventType())) {
                projectBooking(event.getBookingId());
            } else if (CqrsProjectionEventType.INVOICE_CHANGED.equals(event.getEventType())) {
                projectInvoice(event);
            } else if (CqrsProjectionEventType.REFUND_CHANGED.equals(event.getEventType())) {
                projectRefund(event);
            } else {
                log.warn("Unknown CQRS projection event type: {}", event.getEventType());
            }
        } catch (Exception ex) {
            log.warn("Could not consume CQRS projection event. payload={}", payload, ex);
            throw new IllegalStateException("Could not consume CQRS projection event", ex);
        }
    }

    private void projectBooking(Long bookingId) {
        if (bookingId == null) {
            return;
        }
        bookingRepository.findByIdWithItems(bookingId).ifPresent(projector::projectStaffBooking);
    }

    private void projectInvoice(CqrsProjectionEvent event) {
        if (event.getInvoiceId() != null) {
            invoiceRepository.findById(event.getInvoiceId()).ifPresent(projector::projectInvoice);
            return;
        }
        if (event.getBookingId() != null) {
            invoiceRepository.findFirstByBookingIdOrderByCreatedAtDesc(event.getBookingId())
                    .ifPresent(projector::projectInvoice);
        }
    }

    private void projectRefund(CqrsProjectionEvent event) {
        if (event.getRefundId() != null) {
            refundRepository.findById(event.getRefundId()).ifPresent(projector::projectRefund);
            return;
        }
        if (event.getBookingId() != null) {
            refundRepository.findFirstByBookingId(event.getBookingId()).ifPresent(projector::projectRefund);
        }
    }
}
