package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;

import java.time.LocalTime;

@Entity
@Table(name = "refund_staff")
public class RefundStaff {

    @Id
    private Long id;

    private String name;

    private String role;

    private Boolean active;

    private Boolean online;

    private LocalTime shiftStart;

    private LocalTime shiftEnd;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public Boolean getOnline() { return online; }
    public void setOnline(Boolean online) { this.online = online; }

    public LocalTime getShiftStart() { return shiftStart; }
    public void setShiftStart(LocalTime shiftStart) { this.shiftStart = shiftStart; }

    public LocalTime getShiftEnd() { return shiftEnd; }
    public void setShiftEnd(LocalTime shiftEnd) { this.shiftEnd = shiftEnd; }
}
