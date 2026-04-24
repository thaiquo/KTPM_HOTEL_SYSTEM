package iuh.fit.hotelsystem_auth.dto.request;

public class RegisterRequest {
    private String email;
    private String password;
    private String phoneNumber;
    private String name;
    private String dateOfBirth;
    private Boolean gender;
    private String role;
    private String address;

    public RegisterRequest() {
    }

    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getPhoneNumber() { return phoneNumber; }
    public String getName() { return name; }
    public String getDateOfBirth() { return dateOfBirth; }
    public Boolean getGender() { return gender; }
    public String getRole() { return role; }
    public String getAddress() { return address; }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public void setGender(Boolean gender) {
        this.gender = gender;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public void setAddress(String address) {
        this.address = address;
    }
}
