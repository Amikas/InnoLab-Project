package at.fhtw.ctfbackend.config;

import at.fhtw.ctfbackend.security.JwtAuthenticationFilter;
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

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002}") String allowedOriginsRaw
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOrigins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        // Login/logout must stay usable even when no CSRF cookie exists yet.
                        .ignoringRequestMatchers("/api/login", "/api/logout", "/ws/**")
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
        // Public (no token needed)
        .requestMatchers("/api/login").permitAll()
        .requestMatchers("/api/csrf-token").permitAll()
        .requestMatchers("/api/auth/**").permitAll()
        .requestMatchers("/ws/**").permitAll()
        .requestMatchers("/api/categories").permitAll()  // Categories are public (theory content)
        .requestMatchers("/api/solves/challenge/*/stats").permitAll()  // Challenge stats are public
        .requestMatchers("/api/solves/challenge/*/count").permitAll()  // Challenge solve counts are public
        .requestMatchers("/api/solves/recent").permitAll()  // Recent solves are public
        .requestMatchers("/api/solves/top-solvers").permitAll()  // Top solvers are public
        .requestMatchers("/api/solves/most-solved").permitAll()  // Most solved challenges are public
        .requestMatchers("/api/solves/total-count").permitAll()  // Total solve count is public

        // Protected (token required)
        .requestMatchers("/api/challenges/admin/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.PUT, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.DELETE, "/api/challenges/**").hasRole("ADMIN")
        .requestMatchers(HttpMethod.POST, "/api/categories/create").hasRole("ADMIN")
        .requestMatchers("/api/challenges/**").permitAll()
        .requestMatchers("/api/environment/**").authenticated()
        .requestMatchers("/api/flags/**").authenticated()
        .requestMatchers("/api/user/me").authenticated()
        .requestMatchers("/api/files/**").authenticated()
        .requestMatchers("/api/solves/me").authenticated()  // User's own solves require auth
        .requestMatchers("/api/solves/check/**").authenticated()  // Checking if user solved requires auth
        .requestMatchers("/api/solves/me/**").authenticated()  // User's own stats require auth

        .anyRequest().authenticated()
)


                .formLogin(AbstractHttpConfigurer::disable)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Set-Cookie"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
