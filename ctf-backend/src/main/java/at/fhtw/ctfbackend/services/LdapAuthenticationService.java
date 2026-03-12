package at.fhtw.ctfbackend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.naming.AuthenticationException;
import javax.naming.Context;
import javax.naming.NamingException;
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
            return false;
        } catch (NamingException ex) {
            logger.error("LDAP bind failed due to server/connection issue for userId={}", userId, ex);
            throw new IllegalStateException("LDAP server unavailable", ex);
        } finally {
            if (context != null) {
                try {
                    context.close();
                } catch (NamingException ex) {
                    logger.debug("Failed to close LDAP context cleanly", ex);
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
