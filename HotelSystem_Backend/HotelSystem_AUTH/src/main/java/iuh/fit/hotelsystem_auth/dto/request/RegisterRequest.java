package iuh.fit.hotelsystem_auth.dto.request;

public class RegisterRequest {
    private String email;
    private String password;
    private String role;

    public RegisterRequest() {
    }

    public String getEmail() { return email; }
    public String getPassword() { return password; }
    public String getRole() { return role; }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
