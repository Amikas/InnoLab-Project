package at.fhtw.ctfbackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    private final Key key;

    // Token validity: 24 hours
    private final long expirationMillis = 1000 * 60 * 60 * 24;

    public JwtUtil(@Value("${JWT_SECRET}") String jwtSecret) {
        this.key = createSigningKey(jwtSecret);
    }

    private Key createSigningKey(String jwtSecret) {
        if (jwtSecret == null || jwtSecret.trim().isEmpty()) {
            throw new IllegalStateException("JWT_SECRET is required and must not be empty");
        }

        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes for HS256");
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Generate JWT with username only (backward compatibility)
    public String generateToken(String username) {
        return generateToken(username, false); // Default to non-admin
    }

    // Generate JWT with username and admin role
    public String generateToken(String username, boolean isAdmin) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("isAdmin", isAdmin);
        return createToken(claims, username);
    }

    // Create token with claims
    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMillis))
                .signWith(key)
                .compact();
    }

    // Get username from token
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    // Check if user is admin from token
    public Boolean isAdminFromToken(String token) {
        Boolean isAdmin = extractClaim(token, claims -> claims.get("isAdmin", Boolean.class));
        return isAdmin != null ? isAdmin : false; // Default to false if claim is missing
    }

    // Get expiration date from token
    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Generic method to extract any claim
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Extract all claims
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // Check if token is expired
    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    // Validate token (structure, signature, and expiration)
    public boolean validateToken(String token) {
        try {
            Jws<Claims> claims = parseToken(token);
            return !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Validate token and check if user is admin
    public boolean validateTokenAndCheckAdmin(String token) {
        return validateToken(token) && isAdminFromToken(token);
    }

    // Parse token (helper method) - kept for backward compatibility
    private Jws<Claims> parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
    }

    // Get all claims from token (useful for debugging)
    public Map<String, Object> getAllClaimsFromToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            Map<String, Object> result = new HashMap<>();
            result.put("username", claims.getSubject());
            result.put("isAdmin", claims.get("isAdmin", Boolean.class));
            result.put("issuedAt", claims.getIssuedAt());
            result.put("expiration", claims.getExpiration());
            return result;
        } catch (JwtException e) {
            return new HashMap<>();
        }
    }
}
