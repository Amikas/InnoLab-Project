package at.fhtw.ctfbackend.security;

import at.fhtw.ctfbackend.logging.LogSafe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.slf4j.MarkerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.stereotype.Component;

/**
 * Emits an AUDIT-marked log line whenever an authentication succeeds.
 *
 * <p>Pairs with the {@code AUDIT} log entry emitted by
 * {@link at.fhtw.ctfbackend.controller.GlobalExceptionHandler} on
 * {@link org.springframework.security.authentication.BadCredentialsException}
 * so the security log stream has a neatly framed view of every login
 * attempt (success or failure).
 *
 * <p>In production, {@code org.springframework.security} is at WARN
 * (see {@code logback-spring.xml}), so this listener is the canonical
 * source of truth for "who logged in" without depending on Spring
 * Security's own verbose audit messages.
 */
@Component
public class AuthenticationSuccessAuditListener {

    private static final Logger logger = LoggerFactory.getLogger(AuthenticationSuccessAuditListener.class);
    private static final Marker AUDIT = MarkerFactory.getMarker("AUDIT");

    @EventListener
    public void onAuthenticationSuccess(AuthenticationSuccessEvent event) {
        String name = event.getAuthentication() != null
                ? event.getAuthentication().getName()
                : "<unknown>";
        // SECURITY: do not log any credential material; only the principal name.
        logger.info(AUDIT, "AuthenticationSucceeded principal={}", LogSafe.sanitizeIdentifier(name));
    }
}
