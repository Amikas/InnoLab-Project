package at.fhtw.ctfbackend.controller;

/**
 * Thrown when a challenge lookup or mutation targets an ID that does not
 * exist. Mapped to HTTP 404 by {@link GlobalExceptionHandler}.
 */
public class ChallengeNotFoundException extends RuntimeException {

    public ChallengeNotFoundException(String challengeId) {
        super("Challenge not found: " + challengeId);
    }
}
