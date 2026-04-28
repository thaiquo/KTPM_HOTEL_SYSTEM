package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.constants.BookingConstants;
import iuh.fit.hotelsystem_booking.entity.RefundStaff;
import iuh.fit.hotelsystem_booking.entity.RefundStatus;
import iuh.fit.hotelsystem_booking.repository.RefundStaffRepository;
import iuh.fit.hotelsystem_booking.repository.RefundTransactionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class StaffWorkloadService {

    private static final List<RefundStatus> ACTIVE_STATUSES = List.of(RefundStatus.ASSIGNED, RefundStatus.PROCESSING);

    private final RefundStaffRepository staffRepository;
    private final RefundTransactionRepository refundRepository;

    public StaffWorkloadService(RefundStaffRepository staffRepository,
                                RefundTransactionRepository refundRepository) {
        this.staffRepository = staffRepository;
        this.refundRepository = refundRepository;
    }

    public Optional<RefundStaff> findBestAvailableStaff() {
        LocalTime now = LocalTime.now();
        return staffRepository.findByActiveTrueAndOnlineTrueAndRole(BookingConstants.REFUND_STAFF_ROLE)
                .stream()
                .filter(staff -> isInShift(staff, now))
                .filter(staff -> activeTaskCount(staff.getId()) < BookingConstants.MAX_ACTIVE_REFUND_TASKS_PER_STAFF)
                .min(Comparator
                        .comparingLong((RefundStaff staff) -> activeTaskCount(staff.getId()))
                        .thenComparingLong(staff -> overdueTaskCount(staff.getId()))
                        .thenComparing(RefundStaff::getId));
    }

    public long activeTaskCount(Long staffId) {
        return refundRepository.countByAssignedToAndStatusIn(staffId, ACTIVE_STATUSES);
    }

    public long overdueTaskCount(Long staffId) {
        return refundRepository.countByAssignedToAndStatus(staffId, RefundStatus.OVERDUE);
    }

    public boolean isInShift(RefundStaff staff, LocalTime now) {
        if (staff.getShiftStart() == null || staff.getShiftEnd() == null) {
            return true;
        }
        LocalTime start = staff.getShiftStart();
        LocalTime end = staff.getShiftEnd();
        if (start.equals(end)) {
            return true;
        }
        if (start.isBefore(end)) {
            return !now.isBefore(start) && now.isBefore(end);
        }
        return !now.isBefore(start) || now.isBefore(end);
    }
}
