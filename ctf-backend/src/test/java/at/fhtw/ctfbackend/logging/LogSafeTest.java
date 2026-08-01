package at.fhtw.ctfbackend.logging;

import java.util.List;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class LogSafeTest {

    @Test
    void masksCommonEnvironmentSecretNamesRegardlessOfCase() {
        List<String> safeArgs = LogSafe.maskProcessArgs(List.of(
                "CTF_SSH_PASSWORD=supersecret",
                "jwt_secret=anothersecret",
                "FLAG=FLAG{secret}",
                "--network=ctf-network"
        ));

        assertEquals("CTF_SSH_PASSWORD=[REDACTED]", safeArgs.get(0));
        assertEquals("jwt_secret=[REDACTED]", safeArgs.get(1));
        assertEquals("FLAG=[REDACTED]", safeArgs.get(2));
        assertEquals("--network=ctf-network", safeArgs.get(3));
    }

    @Test
    void sanitizesSecretsInExceptionMessages() {
        String safe = LogSafe.sanitizeThrowable(
                new RuntimeException("Docker failed FLAG=FLAG{supersecret} CTF_SSH_PASSWORD=topsecret"));

        assertFalse(safe.contains("supersecret"));
        assertFalse(safe.contains("topsecret"));
    }
}
