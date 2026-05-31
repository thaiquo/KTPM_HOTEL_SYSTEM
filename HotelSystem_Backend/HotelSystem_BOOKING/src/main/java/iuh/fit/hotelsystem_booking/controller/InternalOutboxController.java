package iuh.fit.hotelsystem_booking.controller;

import iuh.fit.hotelsystem_booking.entity.OutboxEvent;
import iuh.fit.hotelsystem_booking.entity.OutboxEventDlq;
import iuh.fit.hotelsystem_booking.repository.OutboxEventDlqRepository;
import iuh.fit.hotelsystem_booking.repository.OutboxEventRepository;
import iuh.fit.hotelsystem_booking.service.OutboxReplayer;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/internal/outbox")
public class InternalOutboxController {


    private final OutboxReplayer outboxReplayer;
    private final OutboxEventDlqRepository outboxEventDlqRepository;
    private final OutboxEventRepository outboxEventRepository;

    public InternalOutboxController(OutboxReplayer outboxReplayer,
                                    OutboxEventDlqRepository outboxEventDlqRepository,
                                    OutboxEventRepository outboxEventRepository) {
        this.outboxReplayer = outboxReplayer;
        this.outboxEventDlqRepository = outboxEventDlqRepository;
        this.outboxEventRepository = outboxEventRepository;
    }

    @PostMapping("/replay")
    public ResponseEntity<Map<String, Object>> replay(@RequestParam(name = "limit", required = false, defaultValue = "100") int limit) {
        int count = outboxReplayer.replay(limit);
        Map<String, Object> out = new HashMap<>();
        out.put("replayed", count);
        return ResponseEntity.ok(out);
    }

    @org.springframework.web.bind.annotation.GetMapping("/dlq")
    public ResponseEntity<java.util.List<OutboxEventDlq>> listDlq(@RequestParam(name = "limit", required = false, defaultValue = "100") int limit) {
        java.util.List<OutboxEventDlq> list = outboxEventDlqRepository.findAll(org.springframework.data.domain.PageRequest.of(0, Math.max(1, limit))).getContent();
        return ResponseEntity.ok(list);
    }

    @org.springframework.web.bind.annotation.PostMapping("/dlq/requeue")
    public ResponseEntity<Map<String, Object>> requeueDlq(@RequestParam(name = "id") Long id) {
        java.util.Optional<OutboxEventDlq> opt = outboxEventDlqRepository.findById(id);
        Map<String, Object> out = new HashMap<>();
        if (opt.isEmpty()) {
            out.put("requeued", 0);
            out.put("reason", "not_found");
            return ResponseEntity.status(404).body(out);
        }
        OutboxEventDlq dlq = opt.get();
        OutboxEvent e = new OutboxEvent();
        e.setAggregateType(dlq.getAggregateType());
        e.setAggregateId(dlq.getAggregateId());
        e.setType(dlq.getType());
        e.setPayload(dlq.getPayload());
        e.setHeaders(dlq.getHeaders());
        e.setOccurredAt(dlq.getOccurredAt());
        e.setAttempts(0);
        e.setLastError(null);
        e.setProcessed(false);
        outboxEventRepository.save(e);
        outboxEventDlqRepository.delete(dlq);
        out.put("requeued", 1);
        return ResponseEntity.ok(out);
    }
}
