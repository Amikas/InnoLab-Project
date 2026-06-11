package at.fhtw.ctfbackend.controller;

public class LdapInfrastructureException extends RuntimeException {
    private final LdapErrorCode errorCode;

    public LdapInfrastructureException(LdapErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public LdapInfrastructureException(LdapErrorCode errorCode, String message, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    public LdapErrorCode getErrorCode() {
        return errorCode;
    }
}
