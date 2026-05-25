package iuh.fit.hotelsystem_room.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(request -> {
                    var corsConfig = new org.springframework.web.cors.CorsConfiguration();
                    corsConfig.setAllowedOrigins(java.util.List.of("*"));
                    corsConfig.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
                    corsConfig.setAllowedHeaders(java.util.List.of("*"));
                    return corsConfig;
                }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    // Cho phép truy cập public cho mọi GET để frontend có thể load danh sách phòng và loại phòng
                    .requestMatchers(org.springframework.http.HttpMethod.GET, "/**").permitAll()
                    .requestMatchers(org.springframework.http.HttpMethod.PUT, "/rooms/internal/**").permitAll()
                    // Các thao tác ghi chỉ dành cho ADMIN và STAFF
                    .requestMatchers(org.springframework.http.HttpMethod.POST, "/**").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(org.springframework.http.HttpMethod.PUT, "/**").hasAnyRole("ADMIN", "STAFF")
                    .requestMatchers(org.springframework.http.HttpMethod.DELETE, "/**").hasAnyRole("ADMIN", "STAFF")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
