package at.fhtw.ctfbackend.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtUtilTest {

    private static final String TEST_SECRET = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil(TEST_SECRET);
    }

    @Test
    void generateToken_ValidUsername_ReturnsToken() {
        String username = "testuser";

        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.split("\\.").length == 3);
    }

    @Test
    void extractUsername_ValidToken_ReturnsUsername() {
        String username = "testuser";
        String token = jwtUtil.generateToken(username);

        String extractedUsername = jwtUtil.extractUsername(token);

        assertEquals(username, extractedUsername);
    }

    @Test
    void validateToken_ValidToken_ReturnsTrue() {
        String username = "testuser";
        String token = jwtUtil.generateToken(username);

        boolean isValid = jwtUtil.validateToken(token);

        assertTrue(isValid);
    }

    @Test
    void validateToken_InvalidToken_ReturnsFalse() {
        String invalidToken = "invalid.jwt.token";

        boolean isValid = jwtUtil.validateToken(invalidToken);

        assertFalse(isValid);
    }

    @Test
    void validateToken_MalformedToken_ReturnsFalse() {
        String malformedToken = "not-a-jwt";

        boolean isValid = jwtUtil.validateToken(malformedToken);

        assertFalse(isValid);
    }

    @Test
    void validateToken_EmptyToken_ReturnsFalse() {
        boolean isValid = jwtUtil.validateToken("");

        assertFalse(isValid);
    }

    @Test
    void extractUsername_InvalidToken_ThrowsException() {
        String invalidToken = "invalid.jwt.token";

        assertThrows(JwtException.class, () -> jwtUtil.extractUsername(invalidToken));
    }

    @Test
    void generateToken_EmptyUsername_GeneratesToken() {
        String username = "";

        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertEquals("", jwtUtil.extractUsername(token));
    }

    @Test
    void generateToken_UsernameWithSpecialCharacters_GeneratesToken() {
        String username = "user@example.com";

        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertEquals(username, jwtUtil.extractUsername(token));
    }

    @Test
    void generateToken_LongUsername_GeneratesToken() {
        String username = "a".repeat(1000);

        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertEquals(username, jwtUtil.extractUsername(token));
    }

    @Test
    void generateToken_MultipleTokens_AreValid() {
        String username = "testuser";

        String token1 = jwtUtil.generateToken(username);
        String token2 = jwtUtil.generateToken(username);

        assertTrue(jwtUtil.validateToken(token1));
        assertTrue(jwtUtil.validateToken(token2));
        assertEquals(username, jwtUtil.extractUsername(token1));
        assertEquals(username, jwtUtil.extractUsername(token2));
    }

    @Test
    void validateToken_TokenFromDifferentKey_ReturnsFalse() {
        String token = jwtUtil.generateToken("testuser");

        JwtUtil differentJwtUtil = new JwtUtil("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

        boolean isValid = differentJwtUtil.validateToken(token);

        assertFalse(isValid);
    }

    @Test
    void extractUsername_TamperedToken_ThrowsException() {
        String username = "testuser";
        String token = jwtUtil.generateToken(username);

        String tamperedToken = token.substring(0, token.length() - 5) + "XXXXX";

        assertThrows(JwtException.class, () -> jwtUtil.extractUsername(tamperedToken));
    }

    @Test
    void generateToken_NullUsername_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> jwtUtil.generateToken(null));
    }

    @Test
    void validateToken_NullToken_ReturnsFalse() {
        boolean isValid = jwtUtil.validateToken(null);

        assertFalse(isValid);
    }

    @Test
    void generateToken_UsernameWithSpaces_GeneratesToken() {
        String username = "user with spaces";

        String token = jwtUtil.generateToken(username);

        assertNotNull(token);
        assertEquals(username, jwtUtil.extractUsername(token));
    }

    @Test
    void tokenLifecycle_GenerateValidateExtract_WorksCorrectly() {
        String username = "lifecycletest";

        String token = jwtUtil.generateToken(username);
        boolean isValid = jwtUtil.validateToken(token);
        String extractedUsername = jwtUtil.extractUsername(token);

        assertTrue(isValid);
        assertEquals(username, extractedUsername);
    }

    @Test
    void validateToken_TokenWithExtraWhitespace_ReturnsFalse() {
        String username = "testuser";
        String token = jwtUtil.generateToken(username);
        String tokenWithWhitespace = "  " + token + "  ";

        boolean isValid = jwtUtil.validateToken(tokenWithWhitespace);

        assertFalse(isValid);
    }
}
