package iuh.fit.hotelsystem_auth.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "registration_sessions")
public class RegistrationSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String registrationToken;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String phoneNumber;

    @Column(nullable = false)
    private String name;

    @Column(nullable = true)
    private String dateOfBirth;

    private String role;

    private String otp;

    private Instant otpExpiry;

    private Instant lastSentAt;

    private String address;

    public RegistrationSession() {}

    public Long getId() { return id; }
    public String getRegistrationToken() { return registrationToken; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getName() { return name; }
    public String getDateOfBirth() { return dateOfBirth; }
    public String getRole() { return role; }
    public String getOtp() { return otp; }
    public Instant getOtpExpiry() { return otpExpiry; }
    public Instant getLastSentAt() { return lastSentAt; }
    public String getAddress() { return address; }

    public void setRegistrationToken(String registrationToken) { this.registrationToken = registrationToken; }
    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setName(String name) { this.name = name; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public void setRole(String role) { this.role = role; }
    public void setOtp(String otp) { this.otp = otp; }
    public void setOtpExpiry(Instant otpExpiry) { this.otpExpiry = otpExpiry; }
    public void setLastSentAt(Instant lastSentAt) { this.lastSentAt = lastSentAt; }
    public void setAddress(String address) { this.address = address; }
}
