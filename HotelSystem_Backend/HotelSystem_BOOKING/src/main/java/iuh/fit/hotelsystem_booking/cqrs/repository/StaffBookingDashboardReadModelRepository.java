package iuh.fit.hotelsystem_booking.cqrs.repository;

import iuh.fit.hotelsystem_booking.cqrs.readmodel.StaffBookingDashboardReadModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface StaffBookingDashboardReadModelRepository extends JpaRepository<StaffBookingDashboardReadModel, Long>,
        JpaSpecificationExecutor<StaffBookingDashboardReadModel> {
}
