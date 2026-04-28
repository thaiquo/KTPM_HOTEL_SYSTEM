package iuh.fit.hotelsystem_booking.dto;

import java.time.LocalDate;

public class GuestRequest {
    private String fullName;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;
    private Boolean primary;
    private Boolean checkInPerson;

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Boolean getPrimary() { return primary; }
    public void setPrimary(Boolean primary) { this.primary = primary; }

    public Boolean getCheckInPerson() { return checkInPerson; }
    public void setCheckInPerson(Boolean checkInPerson) { this.checkInPerson = checkInPerson; }
}
