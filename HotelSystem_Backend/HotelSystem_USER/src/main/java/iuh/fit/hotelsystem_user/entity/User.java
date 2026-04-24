package iuh.fit.hotelsystem_user.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true)
    private String phoneNumber;

    @Column(nullable = false)
    private String name;

    @Column(nullable = true)
    private String dateOfBirth;

    @Column(nullable = true)
    private String address;

    @Column(nullable = true)
    private Boolean gender;

    @Column(nullable = false)
    private Boolean active = true;

    @ManyToOne
    @JoinColumn(name = "role_id")
    private Role role;

    public User() {}

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getName() { return name; }
    public String getDateOfBirth() { return dateOfBirth; }
    public String getAddress() { return address; }
    public Boolean getGender() { return gender; }
    public Boolean getActive() { return active; }
    public Role getRole() { return role; }

    public void setEmail(String email) { this.email = email; }
    public void setPassword(String password) { this.password = password; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setName(String name) { this.name = name; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public void setAddress(String address) { this.address = address; }
    public void setGender(Boolean gender) { this.gender = gender; }
    public void setActive(Boolean active) { this.active = active; }
    public void setRole(Role role) { this.role = role; }
}
