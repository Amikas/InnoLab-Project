package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.LoginCredentialsDto;
import at.fhtw.ctfbackend.entity.UserEntity;
import at.fhtw.ctfbackend.logging.LogSafe;
import at.fhtw.ctfbackend.security.JwtUtil;
import at.fhtw.ctfbackend.services.LdapAuthenticationService;
import at.fhtw.ctfbackend.services.UserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final JwtUtil jwtUtil;
    private final LdapAuthenticationService ldapAuthenticationService;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;

    public AuthController(
        JwtUtil jwtUtil,
        LdapAuthenticationService ldapAuthenticationService,
        UserService userService,
        ApplicationEventPublisher eventPublisher
    ) {
        this.jwtUtil = jwtUtil;
        this.ldapAuthenticationService = ldapAuthenticationService;
        this.userService = userService;
        this.eventPublisher = eventPublisher;
    }

    @PostMapping("/api/login")
    public ResponseEntity<Map<String, Object>> login(
        @RequestBody LoginCredentialsDto credentials,
        HttpServletResponse response
    ) {
        Map<String, Object> responseBody = new HashMap<>();

        String username = credentials.getUsername();
        String password = credentials.getPassword();

        boolean authenticated = ldapAuthenticationService.authenticate(
            username,
            password
        );
        if (!authenticated) {
            responseBody.put("status", "error");
            responseBody.put("message", "Invalid username or password");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                responseBody
            );
        }

        UserEntity user = userService.ensureUserExistsForLogin(username);
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            responseBody.put("status", "error");
            responseBody.put("message", "Your account has been deactivated");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                responseBody
            );
        }

        user = userService.markSuccessfulLogin(user);

        boolean isAdmin = Boolean.TRUE.equals(user.getIsAdmin());
        String jwtToken = jwtUtil.generateToken(user.getUsername(), isAdmin);

        // Set HTTP-only cookie
        Cookie authCookie = new Cookie("auth_token", jwtToken);
        authCookie.setHttpOnly(true);
        authCookie.setSecure(false);
        authCookie.setPath("/");
        authCookie.setMaxAge(24 * 60 * 60); // 24 hours
        authCookie.setAttribute("SameSite", "Lax");
        response.addCookie(authCookie);

        responseBody.put("status", "success");
        responseBody.put("message", "Welcome, " + user.getUsername() + "!");
        responseBody.put("username", user.getUsername());
        responseBody.put("email", user.getEffectiveEmail());
        responseBody.put("displayName", user.getDisplayName());
        responseBody.put("isAdmin", isAdmin);

        try {
            eventPublisher.publishEvent(new AuthenticationSuccessEvent(
                new UsernamePasswordAuthenticationToken(user.getUsername(), null)
            ));
        } catch (RuntimeException ex) {
            logger.warn("Failed to publish successful-login audit event: {}",
                LogSafe.sanitizeThrowable(ex));
        }

        return ResponseEntity.ok(responseBody);
    }

    @PostMapping("/api/logout")
    public Map<String, String> logout(HttpServletResponse response) {
        // Clear the auth cookie
        Cookie authCookie = new Cookie("auth_token", "");
        authCookie.setHttpOnly(true);
        authCookie.setSecure(false);
        authCookie.setPath("/");
        authCookie.setMaxAge(0); // Expire immediately

        response.addCookie(authCookie);

        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("status", "success");
        responseBody.put("message", "Logged out successfully");

        return responseBody;
    }

    @GetMapping("/api/user/me")
    public Map<String, Object> getCurrentUser(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        if (authentication != null && authentication.isAuthenticated()) {
            UserEntity user = userService.getRequiredUser(
                authentication.getName()
            );

            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEffectiveEmail());
            response.put("displayName", user.getDisplayName());
            response.put("isAdmin", user.getIsAdmin());
            response.put("isActive", user.getIsActive());
            response.put("createdAt", user.getCreatedAt());
            response.put("lastLoginAt", user.getLastLoginAt());
            response.put("status", "success");
        } else {
            response.put("status", "error");
            response.put("message", "Not authenticated");
        }
        return response;
    }

    @GetMapping("/api/auth/me")
    public Map<String, Object> getUserInfo(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        if (authentication != null && authentication.isAuthenticated()) {
            UserEntity user = userService.getRequiredUser(
                authentication.getName()
            );

            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEffectiveEmail());
            response.put("displayName", user.getDisplayName());
            response.put("createdAt", user.getCreatedAt());
            response.put("lastLoginAt", user.getLastLoginAt());
            response.put("isAdmin", user.getIsAdmin());
            response.put("isActive", user.getIsActive());
            response.put("status", "success");
        } else {
            response.put("status", "error");
            response.put("message", "Not authenticated");
        }
        return response;
    }

    @GetMapping("/api/auth/admin-check")
    public Map<String, Object> checkAdminStatus(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        if (authentication != null && authentication.isAuthenticated()) {
            UserEntity user = userService.getRequiredUser(
                authentication.getName()
            );
            response.put("isAdmin", user.getIsAdmin());
            response.put("isActive", user.getIsActive());
            response.put("status", "success");
        } else {
            response.put("isAdmin", false);
            response.put("status", "error");
            response.put("message", "Not authenticated");
        }
        return response;
    }
}
