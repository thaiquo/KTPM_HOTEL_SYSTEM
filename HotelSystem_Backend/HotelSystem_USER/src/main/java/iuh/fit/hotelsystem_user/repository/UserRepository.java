package iuh.fit.hotelsystem_user.repository;

import iuh.fit.hotelsystem_user.entity.User;
import iuh.fit.hotelsystem_user.entity.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);

    @Query("""
            select count(u) > 0 from User u
            where u.id = :userId
              and u.active = true
              and u.role.name in (iuh.fit.hotelsystem_user.entity.enums.RoleName.STAFF,
                                  iuh.fit.hotelsystem_user.entity.enums.RoleName.ADMIN)
            """)
    boolean isActiveStaffOrAdmin(@Param("userId") Long userId);

    @Query("""
            select u from User u
            where u.role.name = :roleName
                and (:active is null or u.active = :active)
                and (
                    :keyword is null or :keyword = ''
                    or lower(u.name) like lower(concat('%', :keyword, '%'))
                    or lower(u.email) like lower(concat('%', :keyword, '%'))
                    or lower(u.phoneNumber) like lower(concat('%', :keyword, '%'))
                )
            order by u.id desc
            """)
    List<User> searchEmployees(
            @Param("roleName") RoleName roleName,
            @Param("keyword") String keyword,
            @Param("active") Boolean active
    );
}
