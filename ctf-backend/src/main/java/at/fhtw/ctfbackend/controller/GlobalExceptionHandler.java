package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.logging.LogSafe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.slf4j.MarkerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Marker for security-auditable events. Pattern: `AUDIT - ...`. */
    private static final Marker AUDIT = MarkerFactory.getMarker("AUDIT");

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleUnhandled(Exception ex) {
        // SECURITY: log the sanitized throwable + the full stack at
        // server side for diagnosis, but only return a generic message
        // to the caller. The X-Request-Id response header (already set
        // by RequestIdFilter) lets support correlate any user-side error
        // back to the backend log line.
        // Keep the stack trace for diagnosis, but render the throwable with
        // a sanitized message (a raw copy would re-leak the message in the
        // stack trace's first line). The cause chain is intentionally dropped:
        // attaching the original cause would re-print its raw message too.
        String sanitized = LogSafe.sanitizeThrowable(ex);
        RuntimeException safe = new RuntimeException(sanitized);
        safe.setStackTrace(ex.getStackTrace());
        logger.error("Unhandled exception: {}", sanitized, safe);
        Map<String, String> response = new HashMap<>();
        response.put("error", "Internal server error");
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        logger.warn("Bad request: {}", LogSafe.sanitizeMessage(ex.getMessage()));
        Map<String, String> response = new HashMap<>();
        response.put("error", "Bad request");
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        // AUDIT marker makes brute-force attempts easy to grep out of logs.
        logger.warn(AUDIT, "Bad credentials: {}", LogSafe.sanitizeThrowable(ex));
        Map<String, String> response = new HashMap<>();
        response.put("error", "Invalid username or password");
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        logger.warn(AUDIT, "Access denied: {}", LogSafe.sanitizeThrowable(ex));
        Map<String, String> response = new HashMap<>();
        response.put("error", "Access denied");
        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(NoHandlerFoundException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Resource not found");
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(AdminStateConflictException.class)
    // Messages from this exception are intentionally user-facing — keep them
    // sanitized at throw sites. We still log them so admins can audit.
    public ResponseEntity<Map<String, String>> handleAdminStateConflict(
        AdminStateConflictException ex
    ) {
        logger.warn(AUDIT, "Admin state conflict: {}",
                LogSafe.sanitizeMessage(ex.getMessage()));
        Map<String, String> response = new HashMap<>();
        response.put("error", ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(LdapInfrastructureException.class)
    public ResponseEntity<Map<String, String>> handleLdapInfrastructure(LdapInfrastructureException ex) {
        // AUDIT: include errorCode so post-mortems can group by infra failure type.
        logger.error(AUDIT, "LDAP infrastructure error [{}]: {}",
                ex.getErrorCode(), LogSafe.sanitizeThrowable(ex));

        String userMessage = switch (ex.getErrorCode()) {
            case DNS_FAILURE, CONNECTION_TIMEOUT, READ_TIMEOUT, SERVER_UNREACHABLE, TLS_ERROR ->
                "LDAP server unreachable, make sure you are connected to the VPN or on the FH server";
            case CONFIG_ERROR ->
                "Authentication service is misconfigured, please contact an administrator";
            case UNKNOWN_INFRASTRUCTURE_ERROR ->
                "Authentication service temporarily unavailable";
        };

        Map<String, String> response = new HashMap<>();
        response.put("error", userMessage);
        response.put("errorCode", ex.getErrorCode().name());

        HttpStatus status = switch (ex.getErrorCode()) {
            case CONFIG_ERROR -> HttpStatus.INTERNAL_SERVER_ERROR;
            default -> HttpStatus.SERVICE_UNAVAILABLE;
        };

        return new ResponseEntity<>(response, status);
    }

    @ExceptionHandler({DisabledException.class, LockedException.class})
    public ResponseEntity<Map<String, String>> handleAccountIssues(Exception ex) {
        logger.warn(AUDIT, "Account issue: {} {}",
                ex.getClass().getSimpleName(), LogSafe.sanitizeThrowable(ex));
        Map<String, String> response = new HashMap<>();
        response.put("error", ex instanceof DisabledException ?
                "Account is disabled" : "Account is locked");

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }
}
