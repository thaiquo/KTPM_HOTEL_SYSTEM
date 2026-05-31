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

import java.util.List;

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

            if (userRepo.countByEmailIgnoreCase("tanthinh@gmail.com") == 0
                    && userRepo.countByPhoneNumber("0901234567") == 0) {
                User admin = new User();
                admin.setEmail("tanthinh@gmail.com");
                admin.setPassword(passwordUtil.encode("123456"));
                admin.setName("Tan Thinh");
                admin.setPhoneNumber("0901234567");
                admin.setActive(true);
                admin.setRole(adminRole);
                userRepo.save(admin);
            }

            if (userRepo.countByEmailIgnoreCase("quocthai@gmail.com") == 0
                    && userRepo.countByPhoneNumber("0902345678") == 0) {
                User staff1 = new User();
                staff1.setEmail("quocthai@gmail.com");
                staff1.setPassword(passwordUtil.encode("123456"));
                staff1.setName("Quoc Thai");
                staff1.setPhoneNumber("0902345678");
                staff1.setActive(true);
                staff1.setRole(staffRole);
                userRepo.save(staff1);
            }

            if (userRepo.countByEmailIgnoreCase("vansang@gmail.com") == 0
                    && userRepo.countByPhoneNumber("0903456789") == 0) {
                User staff2 = new User();
                staff2.setEmail("vansang@gmail.com");
                staff2.setPassword(passwordUtil.encode("123456"));
                staff2.setName("Van Sang");
                staff2.setPhoneNumber("0903456789");
                staff2.setActive(true);
                staff2.setRole(staffRole);
                userRepo.save(staff2);
            }

            List<CustomerSeed> customers = List.of(
                    new CustomerSeed("nguyenvana@gmail.com", "Nguyễn Văn A", "0901234567", "15/07/1990", true, "Quận 1, TP. Hồ Chí Minh"),
                    new CustomerSeed("nguyentanthinh@gmail.com", "Nguyễn Tấn Thịnh", "0397994524", "06/11/2004", true, "Quận 1, TP. Hồ Chí Minh"),
                    new CustomerSeed("minhchau@gmail.com", "Trần Minh Châu", "0397994525", "18/02/2001", false, "Quận 3, TP. Hồ Chí Minh"),
                    new CustomerSeed("quanghuy@gmail.com", "Lê Quang Huy", "0397994526", "24/09/1999", true, "Thủ Đức, TP. Hồ Chí Minh"),
                    new CustomerSeed("thuylinh@gmail.com", "Phạm Thùy Linh", "0397994527", "12/07/2002", false, "Biên Hòa, Đồng Nai"),
                    new CustomerSeed("anhkiet@gmail.com", "Nguyễn Anh Kiệt", "0397994528", "03/03/2000", true, "Dĩ An, Bình Dương"),
                    new CustomerSeed("ngocanh@gmail.com", "Võ Ngọc Ánh", "0397994529", "27/12/2003", false, "Nha Trang, Khánh Hòa"),
                    new CustomerSeed("duythanh@gmail.com", "Bùi Duy Thành", "0397994530", "15/05/1998", true, "Cần Thơ"),
                    new CustomerSeed("maihoang@gmail.com", "Đặng Mai Hoàng", "0397994531", "09/10/2001", false, "Vũng Tàu"),
                    new CustomerSeed("baotran@gmail.com", "Trịnh Bảo Trân", "0397994532", "21/01/2005", false, "Tây Ninh"),
                    new CustomerSeed("khoiminh@gmail.com", "Phan Khôi Minh", "0397994533", "30/08/2002", true, "Bình Dương")
            );

            for (CustomerSeed customer : customers) {
                if (userRepo.countByEmailIgnoreCase(customer.email()) == 0
                        && userRepo.countByPhoneNumber(customer.phoneNumber()) == 0) {
                    User user = new User();
                    user.setEmail(customer.email());
                    user.setPassword(passwordUtil.encode("123456"));
                    user.setName(customer.name());
                    user.setPhoneNumber(customer.phoneNumber());
                    user.setDateOfBirth(customer.dateOfBirth());
                    user.setGender(customer.gender());
                    user.setAddress(customer.address());
                    user.setActive(true);
                    user.setRole(customerRole);
                    userRepo.save(user);
                }
            }
        };
    }

    private record CustomerSeed(String email, String name, String phoneNumber, String dateOfBirth, Boolean gender, String address) {}
}
