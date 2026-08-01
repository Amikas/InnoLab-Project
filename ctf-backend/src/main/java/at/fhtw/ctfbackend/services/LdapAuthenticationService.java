package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.logging.LogSafe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import at.fhtw.ctfbackend.controller.LdapErrorCode;
import at.fhtw.ctfbackend.controller.LdapInfrastructureException;
import javax.naming.AuthenticationException;
import javax.naming.CommunicationException;
import javax.naming.ConfigurationException;
import javax.naming.Context;
import javax.naming.NamingException;
import javax.naming.NoInitialContextException;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.util.Hashtable;

@Service
public class LdapAuthenticationService {

    private static final Logger logger = LoggerFactory.getLogger(LdapAuthenticationService.class);

    private final String ldapUrl;
    private final String ldapBaseDn;
    private final int timeoutMs;

    public LdapAuthenticationService(
            @Value("${spring.ldap.urls:ldaps://ldap.technikum-wien.at:636}") String ldapUrl,
            @Value("${spring.ldap.base:ou=people,dc=technikum-wien,dc=at}") String ldapBaseDn,
            @Value("${spring.ldap.connect-timeout-ms:5000}") int timeoutMs) {

        this.ldapUrl = ldapUrl;
        this.ldapBaseDn = ldapBaseDn.replace(" ", "");
        this.timeoutMs = timeoutMs;
    }

    public boolean authenticate(String username, String password) {
        if (isBlank(username) || isBlank(password)) {
            return false;
        }

        String userId = normalizeUserId(username);
        String bindDn = buildBindDn(userId);

        Hashtable<String, String> env = new Hashtable<>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
        env.put(Context.PROVIDER_URL, ldapUrl);
        env.put(Context.SECURITY_AUTHENTICATION, "simple");
        env.put(Context.SECURITY_PRINCIPAL, bindDn);
        env.put(Context.SECURITY_CREDENTIALS, password);
        env.put("com.sun.jndi.ldap.connect.timeout", String.valueOf(timeoutMs));
        env.put("com.sun.jndi.ldap.read.timeout", String.valueOf(timeoutMs));

        DirContext context = null;
        try {
            context = new InitialDirContext(env);
            return true;
        } catch (AuthenticationException ex) {
            // Bad credentials are expected; do not bubble the bind DN or
            // any inner message into logs. AuthenticationException.getMessage()
            // is typically generic — passing through LogSafe.sanitizeThrowable
            // keeps the LogSafe discipline uniform across the backend.
            logger.warn("LDAP authentication failed for userId={}: {}",
                    LogSafe.sanitizeIdentifier(userId), LogSafe.sanitizeThrowable(ex));
            return false;
        } catch (CommunicationException ex) {
            Throwable rootCause = ex.getRootCause() != null ? ex.getRootCause() : ex;
            String causeMessage = rootCause.getMessage() != null ? rootCause.getMessage().toLowerCase() : "";
            String exceptionName = rootCause.getClass().getSimpleName();

            LdapErrorCode errorCode;
            if (exceptionName.equals("UnknownHostException")) {
                errorCode = LdapErrorCode.DNS_FAILURE;
            } else if (exceptionName.equals("SocketTimeoutException")) {
                errorCode = causeMessage.contains("read")
                    ? LdapErrorCode.READ_TIMEOUT
                    : LdapErrorCode.CONNECTION_TIMEOUT;
            } else if (exceptionName.equals("ConnectException") || causeMessage.contains("connection refused")) {
                errorCode = LdapErrorCode.SERVER_UNREACHABLE;
            } else if (exceptionName.contains("SSL") || exceptionName.contains("Cert") || causeMessage.contains("handshake")) {
                // SECURITY: still classified as TLS_ERROR so audit dashboards
                // and the LdapInfrastructureException user-facing message
                // remain accurate (this branch was lost in a prior
                // accidental `} else else {` collapse and is being restored).
                errorCode = LdapErrorCode.TLS_ERROR;
            } else {
                errorCode = LdapErrorCode.UNKNOWN_INFRASTRUCTURE_ERROR;
            }

            // SECURITY: strip any FLAG=/PASSWORD=/etc. that the JNDI stack
            // may have included in causeMessage when echoing bind context.
            logger.error("LDAP communication error [{}] for userId={}: {}",
                    errorCode, LogSafe.sanitizeIdentifier(userId),
                    LogSafe.sanitizeMessage(causeMessage + " (" + exceptionName + ")"));
            throw new LdapInfrastructureException(errorCode, "LDAP infrastructure failure: " + exceptionName);
        } catch (ConfigurationException | NoInitialContextException ex) {
            logger.error("LDAP configuration error for userId={}: {}",
                    LogSafe.sanitizeIdentifier(userId), LogSafe.sanitizeThrowable(ex));
            throw new LdapInfrastructureException(LdapErrorCode.CONFIG_ERROR, "LDAP configuration error", ex);
        } catch (NamingException ex) {
            logger.error("LDAP unexpected error for userId={}: {}",
                    LogSafe.sanitizeIdentifier(userId), LogSafe.sanitizeThrowable(ex));
            throw new LdapInfrastructureException(LdapErrorCode.UNKNOWN_INFRASTRUCTURE_ERROR, "LDAP unexpected error", ex);
        } finally {
            if (context != null) {
                try {
                    context.close();
                } catch (NamingException ex) {
                    logger.debug("Failed to close LDAP context cleanly: {}",
                            LogSafe.sanitizeThrowable(ex));
                }
            }
        }
    }

    private String buildBindDn(String userId) {
        return "uid=" + userId + "," + ldapBaseDn;
    }

    private String normalizeUserId(String username) {
        String normalized = username.trim();

        if (normalized.startsWith("uid=") && normalized.contains(",")) {
            int uidStart = "uid=".length();
            int uidEnd = normalized.indexOf(',');
            if (uidEnd > uidStart) {
                return normalized.substring(uidStart, uidEnd);
            }
        }

        int atIndex = normalized.indexOf('@');
        if (atIndex > 0) {
            return normalized.substring(0, atIndex);
        }

        return normalized;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
