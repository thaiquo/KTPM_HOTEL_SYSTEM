package iuh.fit.hotelsystem_user.controller;

import iuh.fit.hotelsystem_user.entity.Role;
import iuh.fit.hotelsystem_user.entity.User;
import iuh.fit.hotelsystem_user.entity.enums.RoleName;
import iuh.fit.hotelsystem_user.repository.RoleRepository;
import iuh.fit.hotelsystem_user.repository.UserRepository;
import iuh.fit.hotelsystem_user.util.PasswordUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users/internal")
public class InternalController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordUtil passwordUtil;

    public InternalController(UserRepository userRepository, RoleRepository roleRepository, PasswordUtil passwordUtil) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordUtil = passwordUtil;
    }

    @GetMapping("/check-exists")
    public ResponseEntity<Map<String, Boolean>> checkExists(
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String phone) {
        boolean exists = false;
        if (email != null) exists = exists || userRepository.findByEmail(email).isPresent();
        if (phone != null) exists = exists || userRepository.findByPhoneNumber(phone).isPresent();
        
        Map<String, Boolean> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyCredentials(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang tạm ngưng");
        }

        if (!passwordUtil.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("email", user.getEmail());
        response.put("role", user.getRole().getName().name());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody Map<String, Object> request) {
        String roleStr = (String) request.get("role");
        RoleName roleName = roleStr == null ? RoleName.CUSTOMER : RoleName.valueOf(roleStr);

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found"));

        User user = new User();
        user.setEmail((String) request.get("email"));
        user.setPhoneNumber((String) request.get("phoneNumber"));
        user.setName((String) request.get("name"));
        user.setDateOfBirth((String) request.get("dateOfBirth"));
        user.setGender((Boolean) request.get("gender"));
        user.setAddress((String) request.get("address"));
        // Đã được encode từ auth-service
        user.setPassword((String) request.get("password")); 
        user.setActive(true);
        user.setRole(role);

        User savedUser = userRepository.save(user);

        Map<String, Object> response = new HashMap<>();
        response.put("id", savedUser.getId());
        response.put("email", savedUser.getEmail());
        response.put("role", savedUser.getRole().getName().name());
        return ResponseEntity.ok(response);
    }
}
