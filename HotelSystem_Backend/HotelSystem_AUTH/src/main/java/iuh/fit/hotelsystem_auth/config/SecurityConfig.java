package iuh.fit.hotelsystem_auth.config;

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

        @Bean
        public WebSecurityCustomizer webSecurityCustomizer() {
                return web -> web.ignoring().requestMatchers("/auth/**", "/error");
        }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // TẮT CSRF
                .csrf(csrf -> csrf.disable())

                // TẮT LOGIN MẶC ĐỊNH
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())

                // KHÔNG DÙNG SESSION
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // PHÂN QUYỀN
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }
}
