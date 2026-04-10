package at.fhtw.ctfbackend.config;

import at.fhtw.ctfbackend.security.JwtAuthenticationFilter;
import at.fhtw.ctfbackend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtUtil jwtUtil,
            @Value("${app.cors.allowed-origins=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://inno1-bif3-p1-w25.cs.technikum-wien.at:3000}") String allowedOriginsRaw
    ) {
        this.jwtUtil = jwtUtil;
        this.allowedOrigins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                        .disable()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
        // Public (no token needed) - MUST be first and exact match
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .requestMatchers("/error").permitAll()
        .requestMatchers("/api/login").permitAll()
        .requestMatchers("/api/csrf-token").permitAll()
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/ws/**").permitAll()
        .requestMatchers("/api/categories").permitAll()
        .requestMatchers("/api/courses/**").permitAll()
        .requestMatchers("/api/solves/challenge/*/stats").permitAll()
        .requestMatchers("/api/solves/challenge/*/count").permitAll()
        .requestMatchers("/api/solves/recent").permitAll()
        .requestMatchers("/api/solves/top-solvers").permitAll()
        .requestMatchers("/api/solves/most-solved").permitAll()
        .requestMatchers("/api/solves/total-count").permitAll()
        .requestMatchers("/api/challenges/admin/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.PUT, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.DELETE, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/categories/create").hasRole("ADMIN")
        .requestMatchers("/api/admin/**").hasRole("ADMIN")
        .requestMatchers("/api/challenges/**").permitAll()
        .requestMatchers("/api/environment/**").authenticated()
        .requestMatchers("/api/flags/**").authenticated()
        .requestMatchers("/api/user/me").authenticated()
        .requestMatchers("/api/files/**").authenticated()
        .requestMatchers("/api/solves/me").authenticated()
        .requestMatchers("/api/solves/check/**").authenticated()
        .requestMatchers("/api/solves/me/**").authenticated()
        .anyRequest().authenticated()
)


                .formLogin(AbstractHttpConfigurer::disable)
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public CookieCsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }
}
