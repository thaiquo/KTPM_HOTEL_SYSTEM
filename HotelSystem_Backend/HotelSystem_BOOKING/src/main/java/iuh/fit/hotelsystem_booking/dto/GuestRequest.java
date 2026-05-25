package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDate;

public class GuestRequest {
    private Long roomId;
    private String fullName;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;
    private String cccd;
    private String note;
    private Boolean primary;
    private Boolean checkInPerson;

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCccd() { return cccd; }
    public void setCccd(String cccd) { this.cccd = cccd; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Boolean getPrimary() { return primary; }
    public void setPrimary(Boolean primary) { this.primary = primary; }

    public Boolean getCheckInPerson() { return checkInPerson; }
    public void setCheckInPerson(Boolean checkInPerson) { this.checkInPerson = checkInPerson; }
}
