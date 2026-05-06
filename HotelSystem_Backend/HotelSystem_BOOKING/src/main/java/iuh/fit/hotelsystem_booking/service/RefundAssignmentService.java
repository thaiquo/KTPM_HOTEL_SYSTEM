package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.RefundTaskEvent;
import iuh.fit.hotelsystem_booking.entity.RefundStaff;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.entity.RefundTransaction;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class RefundAssignmentService {

    private static final Logger log = LoggerFactory.getLogger(RefundAssignmentService.class);

    private final RefundTransactionRepository refundRepository;
    private final StaffWorkloadService staffWorkloadService;
    private final RefundQueueProducer refundQueueProducer;
    private final RefundAuditService refundAuditService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${user.service.url:http://user-service:8082}")
    private String userServiceUrl;

    public RefundAssignmentService(RefundTransactionRepository refundRepository,
                                   StaffWorkloadService staffWorkloadService,
                                   RefundQueueProducer refundQueueProducer,
                                   RefundAuditService refundAuditService) {
        this.refundRepository = refundRepository;
        this.staffWorkloadService = staffWorkloadService;
        this.refundQueueProducer = refundQueueProducer;
        this.refundAuditService = refundAuditService;
    }

    @Transactional
    public RefundTransaction assignToStaff(Long refundRequestId, Long staffId) {
        if (staffId == null) {
            throw new IllegalArgumentException("staffId is required");
        }
        if (!isStaffOrAdmin(staffId)) {
            throw new IllegalStateException("User is not STAFF or ADMIN: " + staffId);
        }
        RefundTransaction refund = refundRepository.findByIdForUpdate(refundRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundRequestId));
        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new IllegalStateException("Only PENDING refund requests can be assigned");
        }
        if (refund.getAssignedTo() != null) {
            throw new IllegalStateException("Refund request is already assigned");
        }
        if (staffWorkloadService.activeTaskCount(staffId)
                >= iuh.fit.hotelsystem_booking.constants.BookingConstants.MAX_ACTIVE_REFUND_TASKS_PER_STAFF) {
            throw new IllegalStateException("Staff has reached max active refund requests");
        }

        refund.setAssignedTo(staffId);
        refund.setAssignedAt(LocalDateTime.now());
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setUpdatedAt(LocalDateTime.now());
        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "ASSIGNED", RefundStatus.PENDING, RefundStatus.ASSIGNED,
                String.valueOf(staffId), "REFUND_STAFF", "Refund request claimed by staff");
        refundQueueProducer.publishAssigned(saved);
        return saved;
    }

    private boolean isStaffOrAdmin(Long staffId) {
        try {
            Boolean result = restTemplate.getForObject(userServiceUrl + "/api/users/" + staffId + "/staff-or-admin",
                    Boolean.class);
            return Boolean.TRUE.equals(result);
        } catch (Exception ex) {
            log.warn("Could not verify staff role via USER service. staffId={}, reason={}", staffId, ex.getMessage());
            return false;
        }
    }

    @Transactional
    public AssignmentResult assignRefund(Long refundRequestId) {
        RefundTransaction refund = refundRepository.findByIdForUpdate(refundRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundRequestId));

        if (refund.getStatus() != RefundStatus.PENDING) {
            log.info("Skip refund assignment because status is not PENDING. refundId={}, status={}",
                    refund.getId(), refund.getStatus());
            return AssignmentResult.alreadyHandled(refund);
        }

        Optional<RefundStaff> staff = staffWorkloadService.findBestAvailableStaff();
        if (staff.isEmpty()) {
            log.info("No available refund staff. refundId={} stays PENDING", refund.getId());
            return AssignmentResult.retry(refund);
        }

        refund.setAssignedTo(staff.get().getId());
        refund.setAssignedAt(LocalDateTime.now());
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setUpdatedAt(LocalDateTime.now());
        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "ASSIGNED", RefundStatus.PENDING, RefundStatus.ASSIGNED,
                String.valueOf(staff.get().getId()), "SYSTEM", "Refund request assigned to staff");
        refundQueueProducer.publishAssigned(saved);
        return AssignmentResult.assigned(saved);
    }

    @Transactional
    public RefundTransaction reassign(Long refundRequestId, Long staffId) {
        RefundTransaction refund = refundRepository.findByIdForUpdate(refundRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Refund request not found: " + refundRequestId));

        if (refund.getStatus() == RefundStatus.REFUNDED || refund.getStatus() == RefundStatus.REJECTED) {
            throw new IllegalStateException("Completed refund cannot be reassigned");
        }

        if (staffId == null) {
            refund.setAssignedTo(null);
            refund.setAssignedAt(null);
            refund.setStatus(RefundStatus.PENDING);
            refund.setUpdatedAt(LocalDateTime.now());
            RefundTransaction saved = refundRepository.save(refund);
            return assignRefund(saved.getId()).refund();
        }

        refund.setAssignedTo(staffId);
        refund.setAssignedAt(LocalDateTime.now());
        refund.setStatus(RefundStatus.ASSIGNED);
        refund.setUpdatedAt(LocalDateTime.now());
        RefundTransaction saved = refundRepository.save(refund);
        refundAuditService.log(saved.getId(), "ASSIGNED", null, RefundStatus.ASSIGNED,
                String.valueOf(staffId), "ADMIN", "Refund request reassigned");
        refundQueueProducer.publishAssigned(saved);
        return saved;
    }

    public void retryLater(RefundTaskEvent event) {
        refundQueueProducer.publishRetry(event);
    }

    public record AssignmentResult(boolean assigned, boolean retry, RefundTransaction refund) {
        static AssignmentResult assigned(RefundTransaction refund) {
            return new AssignmentResult(true, false, refund);
        }

        static AssignmentResult retry(RefundTransaction refund) {
            return new AssignmentResult(false, true, refund);
        }

        static AssignmentResult alreadyHandled(RefundTransaction refund) {
            return new AssignmentResult(false, false, refund);
        }
    }
}
