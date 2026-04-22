package iuh.fit.hotelsystem_auth.dto.response;

import iuh.fit.hotelsystem_auth.entity.User;

public class UserDto {
    private Long id;
    private String email;
    private String phoneNumber;
    private String name;
    private String dateOfBirth;
    private String address;
    private String role;

    public UserDto() {}

    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.phoneNumber = user.getPhoneNumber();
        this.name = user.getName();
        this.dateOfBirth = user.getDateOfBirth();
        this.address = user.getAddress();
        this.role = user.getRole().getName().name();
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getName() { return name; }
    public String getDateOfBirth() { return dateOfBirth; }
    public String getAddress() { return address; }
    public String getRole() { return role; }

    public void setId(Long id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setName(String name) { this.name = name; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public void setAddress(String address) { this.address = address; }
    public void setRole(String role) { this.role = role; }
}
