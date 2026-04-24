package iuh.fit.hotelsystem_user.dto.response;

import iuh.fit.hotelsystem_user.entity.User;

public class UserDto {
    private Long id;
    private String email;
    private String phoneNumber;
    private String name;
    private String dateOfBirth;
    private Boolean gender;
    private String address;
    private Boolean active;
    private String role;

    public UserDto() {}

    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.phoneNumber = user.getPhoneNumber();
        this.name = user.getName();
        this.dateOfBirth = user.getDateOfBirth();
        this.gender = user.getGender();
        this.address = user.getAddress();
        this.active = user.getActive();
        this.role = user.getRole() != null ? user.getRole().getName().name() : null;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getName() { return name; }
    public String getDateOfBirth() { return dateOfBirth; }
    public Boolean getGender() { return gender; }
    public String getAddress() { return address; }
    public Boolean getActive() { return active; }
    public String getRole() { return role; }

    public void setId(Long id) { this.id = id; }
    public void setEmail(String email) { this.email = email; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    public void setName(String name) { this.name = name; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public void setGender(Boolean gender) { this.gender = gender; }
    public void setAddress(String address) { this.address = address; }
    public void setActive(Boolean active) { this.active = active; }
    public void setRole(String role) { this.role = role; }
}
