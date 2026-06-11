package at.fhtw.ctfbackend.controller;

public enum LdapErrorCode {
    SERVER_UNREACHABLE,
    CONNECTION_TIMEOUT,
    READ_TIMEOUT,
    TLS_ERROR,
    DNS_FAILURE,
    CONFIG_ERROR,
    UNKNOWN_INFRASTRUCTURE_ERROR
}
