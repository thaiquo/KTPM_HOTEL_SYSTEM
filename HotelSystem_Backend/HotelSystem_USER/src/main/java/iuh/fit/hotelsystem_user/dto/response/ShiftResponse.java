package iuh.fit.hotelsystem_user.dto.response;

import iuh.fit.hotelsystem_user.entity.Shift;
import java.time.LocalDateTime;

public class ShiftResponse {
    private Long id;
    private String name;
    private String startTime;
    private String endTime;
    private LocalDateTime createdAt;

    public ShiftResponse() {
    }

    public ShiftResponse(Shift shift) {
        this.id = shift.getId();
        this.name = shift.getName();
        this.startTime = shift.getStartTime().toString();
        this.endTime = shift.getEndTime().toString();
        this.createdAt = shift.getCreatedAt();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
