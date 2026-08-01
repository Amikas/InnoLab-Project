package at.fhtw.ctfbackend.config;

import at.fhtw.ctfbackend.filter.RateLimitFilter;
import at.fhtw.ctfbackend.security.JwtAuthenticationFilter;
import at.fhtw.ctfbackend.security.JwtUtil;
import at.fhtw.ctfbackend.services.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtUtil jwtUtil;
    private final UserService userService;
    private final RateLimitFilter rateLimitFilter;
    private final List<String> allowedOrigins;

    public SecurityConfig(
            JwtUtil jwtUtil,
            UserService userService,
            RateLimitFilter rateLimitFilter,
            @Value("${app.cors.allowed-origins:http://localhost:3000,http://127.0.0.1:3000,http://localhost:3002,http://inno1-bif3-p1-w25.cs.technikum-wien.at:3000}") List<String> allowedOrigins
    ) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
        this.rateLimitFilter = rateLimitFilter;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Set-Cookie", "X-RateLimit-Remaining", "Retry-After", "X-Request-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtUtil, userService);
    }

    /**
     * RequestIdFilter is NOT injected or registered here on purpose.
     *
     * <p>It is a {@code @Component} {@link org.springframework.web.filter.OncePerRequestFilter}
     * annotated {@code @Order(Ordered.HIGHEST_PRECEDENCE)}, so Spring Boot
     * auto-registers it as a global servlet filter with order
     * {@code Integer.MIN_VALUE} \u2014 ahead of Spring Security's
     * {@code SecurityFilterChain} which runs at
     * {@code SecurityProperties.DEFAULT_FILTER_ORDER = -100}. The per-request
     * attribute set by {@code OncePerRequestFilter} guarantees at-most-once
     * execution even if Spring Security ever discovered it elsewhere. Single
     * registration path = single source of truth.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/login").permitAll()
                        .requestMatchers("/api/health").permitAll()
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
                .addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

}
