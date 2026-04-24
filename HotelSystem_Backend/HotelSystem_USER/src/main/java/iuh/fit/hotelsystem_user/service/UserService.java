package iuh.fit.hotelsystem_user.service;

import iuh.fit.hotelsystem_user.dto.request.CreateEmployeeRequest;
import iuh.fit.hotelsystem_user.dto.request.UpdateEmployeeRequest;
import iuh.fit.hotelsystem_user.dto.response.UserDto;
import iuh.fit.hotelsystem_user.entity.Role;
import iuh.fit.hotelsystem_user.entity.User;
import iuh.fit.hotelsystem_user.entity.enums.RoleName;
import iuh.fit.hotelsystem_user.repository.RoleRepository;
import iuh.fit.hotelsystem_user.repository.UserRepository;
import iuh.fit.hotelsystem_user.util.PasswordUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.*;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordUtil passwordUtil;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordUtil passwordUtil
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordUtil = passwordUtil;
    }

    public UserDto getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy người dùng"));
        return new UserDto(user);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UserDto updated) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy người dùng"));

        user.setName(updated.getName());
        user.setPhoneNumber(updated.getPhoneNumber());
        user.setAddress(updated.getAddress());
        user.setDateOfBirth(updated.getDateOfBirth());
        user.setGender(updated.getGender());

        return new UserDto(userRepository.save(user));
    }

    public List<UserDto> getEmployees(String keyword, Boolean active) {
        return userRepository.searchEmployees(RoleName.STAFF, keyword, active)
                .stream()
                .map(UserDto::new)
                .toList();
    }

    @Transactional
    public UserDto createEmployee(CreateEmployeeRequest request) {
        validateCreateRequest(request);

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "Email đã tồn tại trong hệ thống");
        }

        if (userRepository.findByPhoneNumber(request.getPhoneNumber()).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "Số điện thoại đã tồn tại trong hệ thống");
        }

        Role staffRole = roleRepository.findByName(RoleName.STAFF)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy role STAFF"));

        User employee = new User();
        employee.setName(request.getName().trim());
        employee.setEmail(request.getEmail().trim().toLowerCase());
        employee.setPassword(passwordUtil.encode(request.getPassword()));
        employee.setPhoneNumber(request.getPhoneNumber().trim());
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setAddress(request.getAddress());
        employee.setActive(request.getActive() == null || request.getActive());
        employee.setRole(staffRole);

        return new UserDto(userRepository.save(employee));
    }

    @Transactional
    public UserDto updateEmployee(Long employeeId, UpdateEmployeeRequest request) {
        User employee = getStaffById(employeeId);

        validateUpdateRequest(request);

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String normalizedPhone = request.getPhoneNumber().trim();

        userRepository.findByEmail(normalizedEmail)
                .filter(user -> !user.getId().equals(employeeId))
                .ifPresent(user -> {
                    throw new ResponseStatusException(CONFLICT, "Email đã tồn tại trong hệ thống");
                });

        userRepository.findByPhoneNumber(normalizedPhone)
                .filter(user -> !user.getId().equals(employeeId))
                .ifPresent(user -> {
                    throw new ResponseStatusException(CONFLICT, "Số điện thoại đã tồn tại trong hệ thống");
                });

        employee.setName(request.getName().trim());
        employee.setEmail(normalizedEmail);
        employee.setPhoneNumber(normalizedPhone);
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setGender(request.getGender());
        employee.setAddress(request.getAddress());
        if (request.getActive() != null) {
            employee.setActive(request.getActive());
        }

        return new UserDto(userRepository.save(employee));
    }

    @Transactional
    public UserDto updateEmployeeStatus(Long employeeId, boolean active) {
        User employee = getStaffById(employeeId);
        employee.setActive(active);
        return new UserDto(userRepository.save(employee));
    }

    @Transactional
    public void deleteEmployee(Long employeeId) {
        User employee = getStaffById(employeeId);
        userRepository.delete(employee);
    }

    private User getStaffById(Long employeeId) {
        User user = userRepository.findById(employeeId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy nhân viên"));

        if (user.getRole() == null || user.getRole().getName() != RoleName.STAFF) {
            throw new ResponseStatusException(BAD_REQUEST, "Người dùng không thuộc nhóm nhân viên");
        }

        return user;
    }

    private void validateCreateRequest(CreateEmployeeRequest request) {
        if (request.getName() == null || request.getName().isBlank()
                || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()
                || request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Thiếu thông tin bắt buộc khi tạo nhân viên");
        }
    }

    private void validateUpdateRequest(UpdateEmployeeRequest request) {
        if (request.getName() == null || request.getName().isBlank()
                || request.getEmail() == null || request.getEmail().isBlank()
                || request.getPhoneNumber() == null || request.getPhoneNumber().isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Thiếu thông tin bắt buộc khi cập nhật nhân viên");
        }
    }
}
