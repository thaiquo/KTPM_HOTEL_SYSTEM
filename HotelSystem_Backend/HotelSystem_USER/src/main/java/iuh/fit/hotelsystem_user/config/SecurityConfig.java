package iuh.fit.hotelsystem_user.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
                        .requestMatchers("GET", "/api/users/employees").permitAll() // GET employees list - must be
                                                                                    // before /employees/**
                        .requestMatchers("GET", "/api/users/customers").permitAll() // GET customers list - must be
                                                                                    // before /customers/**
                        .requestMatchers("POST", "/api/users/employees").permitAll() // POST employees allowed
                                                                                     // (internal)
                        .requestMatchers("POST", "/api/users/customers").permitAll() // POST customers allowed
                                                                                     // (internal)
                        .requestMatchers("PUT", "/api/users/employees/**").hasRole("ADMIN") // PUT employees needs ADMIN
                        .requestMatchers("PUT", "/api/users/customers/**").hasRole("ADMIN") // PUT customers needs ADMIN
                        .requestMatchers("PATCH", "/api/users/employees/**").hasRole("ADMIN") // PATCH employees needs
                                                                                              // ADMIN
                        .requestMatchers("PATCH", "/api/users/customers/**").hasRole("ADMIN") // PATCH customers needs
                                                                                              // ADMIN
                        .requestMatchers("DELETE", "/api/users/employees/**").hasRole("ADMIN") // DELETE employees needs
                                                                                               // ADMIN
                        .requestMatchers("/api/shifts/**").permitAll() // Shift APIs public
                        .requestMatchers("/api/users/profile/**", "/api/users/me").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtFilter,
                        org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
