package iuh.fit.hotelsystem_user.config;

import iuh.fit.hotelsystem_user.entity.Shift;
import iuh.fit.hotelsystem_user.repository.ShiftRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import java.time.LocalTime;

@Component
public class ShiftSeeder {
    private final ShiftRepository shiftRepository;

    public ShiftSeeder(ShiftRepository shiftRepository) {
        this.shiftRepository = shiftRepository;
    }

    @PostConstruct
    public void seed() {
        createOrUpdate("Ca sáng", LocalTime.of(6, 0), LocalTime.of(14, 0));
        createOrUpdate("Ca chiều", LocalTime.of(14, 0), LocalTime.of(22, 0));
        createOrUpdate("Ca đêm", LocalTime.of(22, 0), LocalTime.of(6, 0));
    }

    private void createOrUpdate(String name, LocalTime start, LocalTime end) {
        shiftRepository.findByName(name).ifPresentOrElse(
            existing -> {
                if (!existing.getStartTime().equals(start) || !existing.getEndTime().equals(end)) {
                    existing.setStartTime(start);
                    existing.setEndTime(end);
                    shiftRepository.save(existing);
                }
            },
            () -> {
                Shift shift = new Shift();
                shift.setName(name);
                shift.setStartTime(start);
                shift.setEndTime(end);
                shiftRepository.save(shift);
            }
        );
    }
}
