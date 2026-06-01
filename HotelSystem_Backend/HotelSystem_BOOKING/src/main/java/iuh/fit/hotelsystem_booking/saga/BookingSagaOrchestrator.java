package iuh.fit.hotelsystem_booking.saga;

import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_booking.config.TimeConfig;
import iuh.fit.hotelsystem_booking.cqrs.event.CqrsOutboxEventService;
import iuh.fit.hotelsystem_booking.dto.BookingEvent;
import iuh.fit.hotelsystem_booking.dto.PaymentResultMessage;
import iuh.fit.hotelsystem_booking.dto.RoomMessage;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingItem;
import iuh.fit.hotelsystem_booking.entity.BookingItemStatus;
import iuh.fit.hotelsystem_booking.entity.BookingLockStatus;
import iuh.fit.hotelsystem_booking.entity.BookingSaga;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.BookingSagaRepository;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.EnumSet;

@Component
public class BookingSagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(BookingSagaOrchestrator.class);
    private static final String SAGA_TYPE = "BookingPayment";

    private final BookingRepository bookingRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final BookingSagaRepository bookingSagaRepository;
    private final CqrsOutboxEventService cqrsOutboxEventService;
    private final ObjectMapper objectMapper;

    public BookingSagaOrchestrator(BookingRepository bookingRepository,
                                   OutboxEventRepository outboxEventRepository,
                                   BookingSagaRepository bookingSagaRepository,
                                   CqrsOutboxEventService cqrsOutboxEventService) {
        this.bookingRepository = bookingRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.bookingSagaRepository = bookingSagaRepository;
        this.cqrsOutboxEventService = cqrsOutboxEventService;
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public void processPaymentResult(PaymentResultMessage result) {
        if (result == null || result.getBookingId() == null) {
            log.warn("Skip payment result saga because payload is missing bookingId");
            return;
        }

        String eventKey = buildEventKey(result);
        BookingSaga existing = bookingSagaRepository.findBySagaTypeAndEventKey(SAGA_TYPE, eventKey).orElse(null);
        if (existing != null && isTerminal(existing.getState())) {
            log.info("Skip duplicate booking payment saga. bookingId={}, eventKey={}, state={}",
                    result.getBookingId(), eventKey, existing.getState());
            return;
        }

        BookingSaga saga = existing != null ? existing : new BookingSaga();
        saga.setBookingId(result.getBookingId());
        saga.setSagaType(SAGA_TYPE);
        saga.setEventKey(eventKey);
        saga.setState("STARTED");
        saga.setPayload(toJson(result));
        saga.setUpdatedAt(LocalDateTime.now());
        bookingSagaRepository.save(saga);

        Booking booking = bookingRepository.findByIdWithItemsForUpdate(result.getBookingId()).orElse(null);
        if (booking == null) {
            completeSaga(saga, "FAILED", "Booking not found: " + result.getBookingId());
            log.warn("Booking not found for payment result: {}", result.getBookingId());
            return;
        }

        try {
            String status = normalize(result.getStatus());
            if ("FULL_PAID".equals(status)) {
                confirmFullPayment(booking, result);
                enqueueBookingEvent(booking, "booking.confirmed", booking.getStatus().name());
                completeSaga(saga, "COMPLETED", null);
                return;
            }
            if ("DEPOSIT_PAID".equals(status)) {
                confirmDepositPayment(booking, result);
                enqueueBookingEvent(booking, "booking.deposit-paid", booking.getStatus().name());
                completeSaga(saga, "COMPLETED", null);
                return;
            }
            if ("REMAINING_PAID".equals(status)) {
                confirmRemainingPayment(booking, result);
                enqueueBookingEvent(booking, "booking.confirmed", booking.getStatus().name());
                completeSaga(saga, "COMPLETED", null);
                return;
            }

            handleFailedPayment(booking, result, saga);
        } catch (Exception ex) {
            completeSaga(saga, "FAILED", ex.getMessage());
            throw ex;
        }
    }

    private void confirmFullPayment(Booking booking, PaymentResultMessage result) {
        if (booking.getStatus() == BookingStatus.CONFIRMED && "PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
            return;
        }
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("PAID");
        booking.setPaidAmount(nonNull(result.getPaidAmount(), booking.getFinalTotal()));
        booking.setPaymentTransactionId(result.getTransactionId());
        booking.setLockStatus(BookingLockStatus.CONFIRMED);
        booking.setConfirmedAt(nowVi());
        markActiveItemsBooked(booking);
        bookingRepository.save(booking);
        cqrsOutboxEventService.enqueueBookingChanged(booking.getId());
        enqueueRoomEvents(booking, "room.confirm");
    }

    private void confirmDepositPayment(Booking booking, PaymentResultMessage result) {
        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.CHECKED_IN) {
            return;
        }
        booking.setStatus(BookingStatus.DEPOSIT_PAID);
        booking.setPaymentStatus("DEPOSITED");
        booking.setPaidAmount(nonNull(result.getPaidAmount(), booking.getDepositAmount()));
        booking.setPaymentTransactionId(result.getTransactionId());
        booking.setLockStatus(BookingLockStatus.CONFIRMED);
        booking.setConfirmedAt(nowVi());
        markActiveItemsBooked(booking);
        bookingRepository.save(booking);
        cqrsOutboxEventService.enqueueBookingChanged(booking.getId());
        enqueueRoomEvents(booking, "room.confirm");
    }

    private void confirmRemainingPayment(Booking booking, PaymentResultMessage result) {
        if (booking.getStatus() == BookingStatus.CONFIRMED && "PAID".equalsIgnoreCase(booking.getPaymentStatus())) {
            return;
        }
        double existingPaid = booking.getPaidAmount() != null ? booking.getPaidAmount() : 0.0;
        double remainingPaid = result.getPaidAmount() != null ? result.getPaidAmount() : 0.0;
        double finalTotal = booking.getFinalTotal() != null ? booking.getFinalTotal() : nonNull(result.getTotalAmount(), 0.0);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPaymentStatus("PAID");
        booking.setPaidAmount(Math.max(finalTotal, existingPaid + remainingPaid));
        booking.setPaymentTransactionId(result.getTransactionId());
        booking.setLockStatus(BookingLockStatus.CONFIRMED);
        if (booking.getConfirmedAt() == null) {
            booking.setConfirmedAt(nowVi());
        }
        markActiveItemsBooked(booking);
        bookingRepository.save(booking);
        cqrsOutboxEventService.enqueueBookingChanged(booking.getId());
        enqueueRoomEvents(booking, "room.confirm");
    }

    private void handleFailedPayment(Booking booking, PaymentResultMessage result, BookingSaga saga) {
        if (!canCompensateByCancelling(booking.getStatus())) {
            completeSaga(saga, "SKIPPED", "Payment failed after booking was already retained in status " + booking.getStatus());
            log.info("Payment failure did not cancel booking because current status is retained. bookingId={}, status={}, tx={}",
                    booking.getId(), booking.getStatus(), result.getTransactionId());
            return;
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setPaymentStatus("FAILED");
        booking.setLockStatus(BookingLockStatus.EXPIRED);
        booking.setCancelledAt(nowVi());
        booking.setCancellationReason("Payment failed or expired");
        booking.setPaymentTransactionId(result.getTransactionId());
        if (booking.getItems() != null) {
            for (BookingItem item : booking.getItems()) {
                item.setStatus(BookingItemStatus.CANCELLED);
            }
        }
        bookingRepository.save(booking);
        cqrsOutboxEventService.enqueueBookingChanged(booking.getId());
        enqueueRoomEvents(booking, "room.release");
        enqueueBookingEvent(booking, "booking.cancelled", BookingStatus.CANCELLED.name());
        completeSaga(saga, "COMPENSATED", null);
    }

    private boolean canCompensateByCancelling(BookingStatus status) {
        return status == null || EnumSet.of(
                BookingStatus.CREATED,
                BookingStatus.PENDING,
                BookingStatus.PENDING_PAYMENT
        ).contains(status);
    }

    private void markActiveItemsBooked(Booking booking) {
        if (booking.getItems() == null) {
            return;
        }
        for (BookingItem item : booking.getItems()) {
            if (item.getStatus() == null
                    || item.getStatus() == BookingItemStatus.PENDING_PAYMENT
                    || item.getStatus() == BookingItemStatus.ACTIVE) {
                item.setStatus(BookingItemStatus.BOOKED);
            }
        }
    }

    private void enqueueRoomEvents(Booking booking, String type) {
        if (booking.getItems() == null) {
            return;
        }
        for (BookingItem item : booking.getItems()) {
            RoomMessage message = new RoomMessage();
            message.setBookingId(booking.getId());
            message.setRoomId(item.getRoomId());
            enqueueOutbox("Booking", String.valueOf(booking.getId()), type, message);
        }
    }

    private void enqueueBookingEvent(Booking booking, String type, String status) {
        BookingEvent event = new BookingEvent();
        event.setBookingId(booking.getId());
        event.setUserId(booking.getUserId());
        event.setStatus(status);
        enqueueOutbox("Booking", String.valueOf(booking.getId()), type, event);
    }

    private void enqueueOutbox(String aggregateType, String aggregateId, String type, Object payload) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setType(type);
        event.setPayload(toJson(payload));
        outboxEventRepository.save(event);
    }

    private void completeSaga(BookingSaga saga, String state, String error) {
        saga.setState(state);
        saga.setLastError(error);
        saga.setUpdatedAt(LocalDateTime.now());
        bookingSagaRepository.save(saga);
    }

    private boolean isTerminal(String state) {
        return "COMPLETED".equals(state) || "COMPENSATED".equals(state) || "SKIPPED".equals(state);
    }

    private String buildEventKey(PaymentResultMessage result) {
        if (result.getTransactionId() != null && !result.getTransactionId().isBlank()) {
            return result.getTransactionId();
        }
        return result.getBookingId() + ":" + normalize(result.getStatus()) + ":" + nonNull(result.getPaidAmount(), 0.0);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private double nonNull(Double value, Double fallback) {
        return value != null ? value : fallback != null ? fallback : 0.0;
    }

    private LocalDateTime nowVi() {
        return ZonedDateTime.now(TimeConfig.VIETNAM_ZONE).toLocalDateTime();
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
    }
}
