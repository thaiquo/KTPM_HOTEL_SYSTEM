package iuh.fit.hotelsystem_user.config;

import iuh.fit.hotelsystem_user.entity.Role;
import iuh.fit.hotelsystem_user.entity.User;
import iuh.fit.hotelsystem_user.entity.enums.RoleName;
import iuh.fit.hotelsystem_user.repository.RoleRepository;
import iuh.fit.hotelsystem_user.repository.UserRepository;
import iuh.fit.hotelsystem_user.util.PasswordUtil;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initAuth(UserRepository userRepo, RoleRepository roleRepo, PasswordUtil passwordUtil) {
        return args -> {
            Role adminRole = roleRepo.findByName(RoleName.ADMIN)
                    .orElseGet(() -> roleRepo.save(new Role(RoleName.ADMIN)));

            Role staffRole = roleRepo.findByName(RoleName.STAFF)
                    .orElseGet(() -> roleRepo.save(new Role(RoleName.STAFF)));

            Role customerRole = roleRepo.findByName(RoleName.CUSTOMER)
                    .orElseGet(() -> roleRepo.save(new Role(RoleName.CUSTOMER)));

            if (userRepo.findByEmail("tanthinh@gmail.com").isEmpty()) {
                User admin = new User();
                admin.setEmail("tanthinh@gmail.com");
                admin.setPassword(passwordUtil.encode("123456"));
                admin.setName("Tan Thinh");
                admin.setPhoneNumber("0901234567");
                admin.setActive(true);
                admin.setRole(adminRole);
                userRepo.save(admin);
            }

            if (userRepo.findByEmail("quocthai@gmail.com").isEmpty()) {
                User staff1 = new User();
                staff1.setEmail("quocthai@gmail.com");
                staff1.setPassword(passwordUtil.encode("123456"));
                staff1.setName("Quoc Thai");
                staff1.setPhoneNumber("0902345678");
                staff1.setActive(true);
                staff1.setRole(staffRole);
                userRepo.save(staff1);
            }

            if (userRepo.findByEmail("vansang@gmail.com").isEmpty()) {
                User staff2 = new User();
                staff2.setEmail("vansang@gmail.com");
                staff2.setPassword(passwordUtil.encode("123456"));
                staff2.setName("Van Sang");
                staff2.setPhoneNumber("0903456789");
                staff2.setActive(true);
                staff2.setRole(staffRole);
                userRepo.save(staff2);
            }
        };
    }
}
