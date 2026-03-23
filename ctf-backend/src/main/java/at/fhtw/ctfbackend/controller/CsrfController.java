package at.fhtw.ctfbackend.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
public class CsrfController {

    private static final Logger logger = LoggerFactory.getLogger(CsrfController.class);

    @GetMapping("/api/csrf-token")
    public Map<String, String> csrfToken(HttpServletRequest request, HttpServletResponse response) {
        logger.info("CSRF token request received from: " + request.getRemoteAddr());
        
        String token = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        logger.info("Generated token: " + token);

        Cookie cookie = new Cookie("XSRF-TOKEN", token);
        cookie.setPath("/");
        cookie.setHttpOnly(false);
        cookie.setSecure(false);
        cookie.setMaxAge(3600);
        response.addCookie(cookie);

        logger.info("CSRF token set in cookie successfully");
        return Map.of("token", token);
    }
}
