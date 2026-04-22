package iuh.fit.hotelsystem_auth.service;

import iuh.fit.hotelsystem_auth.dto.response.UserDto;
import iuh.fit.hotelsystem_auth.entity.User;
import iuh.fit.hotelsystem_auth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public UserDto getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return new UserDto(user);
    }

    @Transactional
    public UserDto updateProfile(Long userId, UserDto updated) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(updated.getName());
        user.setPhoneNumber(updated.getPhoneNumber());
        user.setAddress(updated.getAddress());
        user.setDateOfBirth(updated.getDateOfBirth());

        return new UserDto(userRepository.save(user));
    }
}
