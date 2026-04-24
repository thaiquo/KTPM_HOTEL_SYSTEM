package iuh.fit.hotelsystem_auth.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String role;

    @Column(nullable = false)
    private Instant expiryDate;

    public Long getId() { return id; }
    public String getToken() { return token; }
    public Long getUserId() { return userId; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public Instant getExpiryDate() { return expiryDate; }

    public void setToken(String token) { this.token = token; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setEmail(String email) { this.email = email; }
    public void setRole(String role) { this.role = role; }
    public void setExpiryDate(Instant expiryDate) { this.expiryDate = expiryDate; }
}
