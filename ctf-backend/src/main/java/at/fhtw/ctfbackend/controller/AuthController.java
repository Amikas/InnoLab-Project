package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.models.LoginCredentials;
import at.fhtw.ctfbackend.security.JwtUtil;
import at.fhtw.ctfbackend.services.LdapAuthenticationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import java.util.HashMap;
import java.util.Map;

@RestController
public class AuthController {

    private final JwtUtil jwtUtil;
    private final LdapAuthenticationService ldapAuthenticationService;

    public AuthController(JwtUtil jwtUtil, LdapAuthenticationService ldapAuthenticationService) {
        this.jwtUtil = jwtUtil;
        this.ldapAuthenticationService = ldapAuthenticationService;
    }

    // List of admin usernames - these users will have admin access
    private final String[] adminUsers = {"admin", "superuser"};

    private boolean isAdminUser(String username) {
        for (String adminUser : adminUsers) {
            if (adminUser.equalsIgnoreCase(username)) {
                return true;
            }
        }
        return false;
    }

    @PostMapping("/api/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginCredentials credentials, HttpServletResponse response) {
        Map<String, Object> responseBody = new HashMap<>();

        String username = credentials.getUsername();
        String password = credentials.getPassword();

        try {
            boolean authenticated = ldapAuthenticationService.authenticate(username, password);
            if (!authenticated) {
                responseBody.put("status", "error");
                responseBody.put("message", "Invalid username or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(responseBody);
            }
        } catch (IllegalStateException ex) {
            responseBody.put("status", "error");
            responseBody.put("message", "Authentication service temporarily unavailable");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(responseBody);
        }

        boolean isAdmin = isAdminUser(username);

        // Generate token with admin information
        String jwtToken = jwtUtil.generateToken(username, isAdmin);

        // Set HTTP-only cookie
        Cookie authCookie = new Cookie("auth_token", jwtToken);
        authCookie.setHttpOnly(true);
        authCookie.setSecure(false);
        authCookie.setPath("/");
        authCookie.setMaxAge(24 * 60 * 60); // 24 hours
        authCookie.setAttribute("SameSite", "Lax");
        response.addCookie(authCookie);

        responseBody.put("status", "success");
        responseBody.put("message", "Welcome, " + username + "!");
        responseBody.put("username", username);
        responseBody.put("isAdmin", isAdmin);

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
            String username = authentication.getName();
            boolean isAdmin = isAdminUser(username);

            response.put("username", username);
            response.put("isAdmin", isAdmin);
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
            String username = authentication.getName();
            boolean isAdmin = isAdminUser(username);

            response.put("username", username);
            response.put("email", username + "@ctf-platform.com"); // Default email format
            response.put("createdAt", "2024-01-01T00:00:00Z"); // Default creation date
            response.put("isAdmin", isAdmin);
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
            boolean isAdmin = isAdminUser(authentication.getName());
            response.put("isAdmin", isAdmin);
            response.put("status", "success");
        } else {
            response.put("isAdmin", false);
            response.put("status", "error");
            response.put("message", "Not authenticated");
        }
        return response;
    }
}
