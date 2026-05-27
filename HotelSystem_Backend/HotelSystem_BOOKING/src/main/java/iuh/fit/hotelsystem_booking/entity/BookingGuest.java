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
    private Long bookingRoomId;
    private Long roomId;
    private String fullName;
    private LocalDate dateOfBirth;
    private String phone;
    private String email;
    private String cccd;
    private String passport;
    private String gender;
    private String note;

    @Enumerated(EnumType.STRING)
    private GuestType type;

    @Enumerated(EnumType.STRING)
    private BookingRoomGuestRole role;

    private Boolean primaryGuest;
    private Boolean checkInPerson;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBookingId() { return bookingId; }
    public void setBookingId(Long bookingId) { this.bookingId = bookingId; }

    public Long getBookingRoomId() { return bookingRoomId; }
    public void setBookingRoomId(Long bookingRoomId) { this.bookingRoomId = bookingRoomId; }

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

    public String getPassport() { return passport; }
    public void setPassport(String passport) { this.passport = passport; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public GuestType getType() { return type; }
    public void setType(GuestType type) { this.type = type; }

    public BookingRoomGuestRole getRole() { return role; }
    public void setRole(BookingRoomGuestRole role) { this.role = role; }

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
