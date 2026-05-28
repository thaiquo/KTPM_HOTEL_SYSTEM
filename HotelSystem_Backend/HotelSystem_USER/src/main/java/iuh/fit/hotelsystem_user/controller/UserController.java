package iuh.fit.hotelsystem_user.controller;

import iuh.fit.hotelsystem_user.dto.request.CreateCustomerRequest;
import iuh.fit.hotelsystem_user.dto.request.CreateEmployeeRequest;
import iuh.fit.hotelsystem_user.dto.request.UpdateCustomerRequest;
import iuh.fit.hotelsystem_user.dto.request.UpdateEmployeeRequest;
import iuh.fit.hotelsystem_user.dto.response.UserDto;
import iuh.fit.hotelsystem_user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.security.Principal;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<UserDto> getProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @GetMapping("/{userId}/staff-or-admin")
    public ResponseEntity<Boolean> isStaffOrAdmin(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.isActiveStaffOrAdmin(userId));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(Principal principal) {
        Long userId = Long.parseLong(principal.getName());
        return ResponseEntity.ok(userService.getProfile(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateMe(Principal principal, @RequestBody UserDto updated) {
        Long userId = Long.parseLong(principal.getName());
        return ResponseEntity.ok(userService.updateProfile(userId, updated));
    }

    @PostMapping
    public ResponseEntity<UserDto> createProfile(Principal principal, @RequestBody UserDto profile) {
        // Ignored or handle if needed. Internal API handles creation now.
        if (principal != null) {
            Long userId = Long.parseLong(principal.getName());
            return ResponseEntity.ok(userService.updateProfile(userId, profile));
        }
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile/{userId}")
    public ResponseEntity<UserDto> updateProfile(@PathVariable Long userId, @RequestBody UserDto updated) {
        return ResponseEntity.ok(userService.updateProfile(userId, updated));
    }

    @GetMapping("/employees")
    public ResponseEntity<List<UserDto>> getEmployees(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(userService.getEmployees(keyword, active));
    }

    @GetMapping("/customers")
    public ResponseEntity<List<UserDto>> getCustomers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(userService.getCustomers(keyword, active));
    }

    @PostMapping("/employees")
    public ResponseEntity<UserDto> createEmployee(@RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.ok(userService.createEmployee(request));
    }

    @PostMapping("/customers")
    public ResponseEntity<UserDto> createCustomer(@RequestBody CreateCustomerRequest request) {
        return ResponseEntity.ok(userService.createCustomer(request));
    }

    @PutMapping("/employees/{employeeId}")
    public ResponseEntity<UserDto> updateEmployee(
            @PathVariable Long employeeId,
            @RequestBody UpdateEmployeeRequest request) {
        return ResponseEntity.ok(userService.updateEmployee(employeeId, request));
    }

    @PutMapping("/customers/{customerId}")
    public ResponseEntity<UserDto> updateCustomer(
            @PathVariable Long customerId,
            @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(userService.updateCustomer(customerId, request));
    }

    @PatchMapping("/employees/{employeeId}/status")
    public ResponseEntity<UserDto> updateEmployeeStatus(
            @PathVariable Long employeeId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(userService.updateEmployeeStatus(employeeId, active));
    }

    @PatchMapping("/customers/{customerId}/status")
    public ResponseEntity<UserDto> updateCustomerStatus(
            @PathVariable Long customerId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(userService.updateCustomerStatus(customerId, active));
    }

    @DeleteMapping("/employees/{employeeId}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long employeeId) {
        userService.deleteEmployee(employeeId);
        return ResponseEntity.noContent().build();
    }
}
