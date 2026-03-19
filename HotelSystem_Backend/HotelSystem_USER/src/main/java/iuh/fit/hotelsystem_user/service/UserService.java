package iuh.fit.hotelsystem_user.service;

import iuh.fit.hotelsystem_user.entity.UserProfile;
import iuh.fit.hotelsystem_user.repository.UserProfileRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserProfileRepository repository;

    public UserService(UserProfileRepository repository) {
        this.repository = repository;
    }

    public UserProfile getProfile(Long userId) {
        return repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));
    }

    public UserProfile updateProfile(Long userId, UserProfile updated) {

        UserProfile profile = repository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        profile.setFullName(updated.getFullName());
        profile.setPhone(updated.getPhone());
        profile.setAddress(updated.getAddress());
        profile.setDateOfBirth(updated.getDateOfBirth());

        return repository.save(profile);
    }

    public UserProfile createProfile(Long userId, UserProfile profile) {
        UserProfile existing = repository.findByUserId(userId).orElse(null);

        if (existing != null) {
            existing.setFullName(profile.getFullName());
            existing.setPhone(profile.getPhone());
            existing.setAddress(profile.getAddress());
            existing.setDateOfBirth(profile.getDateOfBirth());
            return repository.save(existing);
        }

        profile.setUserId(userId);
        return repository.save(profile);
    }
}
