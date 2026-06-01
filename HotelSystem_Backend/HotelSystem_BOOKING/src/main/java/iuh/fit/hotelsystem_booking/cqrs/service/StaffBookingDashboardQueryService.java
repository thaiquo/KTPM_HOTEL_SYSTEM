package iuh.fit.hotelsystem_booking.cqrs.service;

import iuh.fit.hotelsystem_booking.cqrs.readmodel.StaffBookingDashboardReadModel;
import iuh.fit.hotelsystem_booking.cqrs.repository.StaffBookingDashboardReadModelRepository;
import iuh.fit.hotelsystem_booking.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class StaffBookingDashboardQueryService {

    private static final int BACKFILL_LIMIT = 500;

    private final StaffBookingDashboardReadModelRepository staffBookingReadRepository;

    public StaffBookingDashboardQueryService(StaffBookingDashboardReadModelRepository staffBookingReadRepository) {
        this.staffBookingReadRepository = staffBookingReadRepository;
    }

    public Page<StaffBookingDashboardReadModel> search(int page, int size, String bookingCode, BookingStatus status) {
        PageRequest pageable = PageRequest.of(
                Math.max(page, 0),
                Math.max(size, 1),
                Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<StaffBookingDashboardReadModel> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (bookingCode != null && !bookingCode.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("bookingCode")), "%" + bookingCode.trim().toLowerCase() + "%"));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status.name()));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        return staffBookingReadRepository.findAll(spec, pageable);
    }

    public List<StaffBookingDashboardReadModel> listLatest() {
        return staffBookingReadRepository
                .findAll(PageRequest.of(0, BACKFILL_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
    }
}
