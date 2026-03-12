package at.fhtw.ctfbackend.controller;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class CsrfController {

    @GetMapping("/api/csrf-token")
    public Map<String, String> csrfToken(CsrfToken csrfToken) {
        // Returning the token also forces token creation and XSRF-TOKEN cookie issuance.
        return Map.of("token", csrfToken.getToken());
    }
}
