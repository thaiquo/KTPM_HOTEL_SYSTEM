package iuh.fit.hotelsystem_user.entity;

import iuh.fit.hotelsystem_user.entity.enums.CheckinStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "shift_checkins")
public class ShiftCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "schedule_id", nullable = false)
    private ShiftSchedule schedule;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Column(name = "checkin_time", nullable = false)
    private LocalDateTime checkinTime;

    @Column(name = "checkout_time", nullable = true)
    private LocalDateTime checkoutTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "checkin_status", nullable = false)
    private CheckinStatus checkinStatus;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public ShiftCheckin() {
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ShiftSchedule getSchedule() {
        return schedule;
    }

    public void setSchedule(ShiftSchedule schedule) {
        this.schedule = schedule;
    }

    public User getEmployee() {
        return employee;
    }

    public void setEmployee(User employee) {
        this.employee = employee;
    }

    public LocalDateTime getCheckinTime() {
        return checkinTime;
    }

    public void setCheckinTime(LocalDateTime checkinTime) {
        this.checkinTime = checkinTime;
    }

    public LocalDateTime getCheckoutTime() {
        return checkoutTime;
    }

    public void setCheckoutTime(LocalDateTime checkoutTime) {
        this.checkoutTime = checkoutTime;
    }

    public CheckinStatus getCheckinStatus() {
        return checkinStatus;
    }

    public void setCheckinStatus(CheckinStatus checkinStatus) {
        this.checkinStatus = checkinStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
