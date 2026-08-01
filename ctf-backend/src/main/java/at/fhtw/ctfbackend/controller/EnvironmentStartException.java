package at.fhtw.ctfbackend.controller;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a user's challenge environment cannot be started.
 *
 * <p>The {@link #getUserMessage()} value is deliberately written for end users
 * and is the only part sent back in the HTTP response. The {@code detail}
 * argument (kept as the exception message) is technical and only ever logged
 * server-side — never returned to the caller.
 */
public class EnvironmentStartException extends RuntimeException {

    private final String userMessage;
    private final HttpStatus status;

    public EnvironmentStartException(String userMessage, String detail, HttpStatus status, Throwable cause) {
        super(detail, cause);
        this.userMessage = userMessage;
        this.status = status;
    }

    public String getUserMessage() {
        return userMessage;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
