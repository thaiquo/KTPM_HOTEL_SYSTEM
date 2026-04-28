package iuh.fit.hotelsystem_booking.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.Period;

@Entity
@Table(name = "booking_guests")
public class BookingGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long bookingId;
    private String fullName;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;

    @Enumerated(EnumType.STRING)
    private GuestType type;

    private Boolean primaryGuest;
    private Boolean checkInPerson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public GuestType getType() { return type; }
    public void setType(GuestType type) { this.type = type; }

    public Boolean getPrimaryGuest() { return primaryGuest; }
    public void setPrimaryGuest(Boolean primaryGuest) { this.primaryGuest = primaryGuest; }

    public Boolean getCheckInPerson() { return checkInPerson; }
    public void setCheckInPerson(Boolean checkInPerson) { this.checkInPerson = checkInPerson; }

    public int ageOn(LocalDate date) {
        if (dateOfBirth == null) {
            return -1;
        }
        return Period.between(dateOfBirth, date).getYears();
    }

    public boolean isAdultOn(LocalDate date) {
        return ageOn(date) >= 18;
    }
}
