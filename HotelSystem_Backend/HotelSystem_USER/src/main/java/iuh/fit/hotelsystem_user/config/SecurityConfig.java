package iuh.fit.hotelsystem_user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/users/internal/**").permitAll() // Internal APIs
                        .requestMatchers(HttpMethod.GET, "/api/users/employees").permitAll() // GET employees list - must be
                                                                                    // before /employees/**
                        .requestMatchers(HttpMethod.GET, "/api/users/customers").permitAll() // GET customers list - must be
                                                                                    // before /customers/**
                        .requestMatchers(HttpMethod.POST, "/api/users/employees").permitAll() // POST employees allowed
                                                                                     // (internal)
                        .requestMatchers(HttpMethod.POST, "/api/users/customers").permitAll() // POST customers allowed
                                                                                     // (internal)
                        .requestMatchers(HttpMethod.PUT, "/api/users/employees/**").hasRole("ADMIN") // PUT employees needs ADMIN
                        .requestMatchers(HttpMethod.PUT, "/api/users/customers/**").hasRole("ADMIN") // PUT customers needs ADMIN
                        .requestMatchers(HttpMethod.PATCH, "/api/users/employees/**").hasRole("ADMIN") // PATCH employees needs
                                                                                              // ADMIN
                        .requestMatchers(HttpMethod.PATCH, "/api/users/customers/**").hasRole("ADMIN") // PATCH customers needs
                                                                                              // ADMIN
                        .requestMatchers(HttpMethod.DELETE, "/api/users/employees/**").hasRole("ADMIN") // DELETE employees needs
                                                                                               // ADMIN
                        .requestMatchers(HttpMethod.GET, "/api/shifts/my-schedule").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/shifts/schedule/*/reset").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/shifts/checkin").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/shifts/checkout").hasAnyRole("STAFF", "ADMIN")
                        .requestMatchers("/api/shifts/**").permitAll() // Shift APIs public
                        .requestMatchers("/api/users/profile/**", "/api/users/me").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtFilter,
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
