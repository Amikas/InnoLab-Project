package at.fhtw.ctfbackend.logging;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * LogSafe: prevents sensitive values from leaking into log lines.
 *
 * <p>All sensitive-value redaction in the backend must flow through
 * this class. Any call site that might serialize a docker run
 * command, an exception message, or a user-supplied identifier that
 * could be correlated with a secret must route through
 * {@link #maskProcessArgs(List)} / {@link #maskProcessArgs(String[])}
 * or {@link #sanitizeMessage(String)} before passing it to the logger.
 *
 * <p>The class is intentionally tiny and side-effect free so it can
 * be unit-tested and so that no dependency-injection gymnastics are
 * required to use it.
 */
public final class LogSafe {

    private LogSafe() { /* no instances */ }

    /**
     * Prefixes that mark an environment-variable or docker-run argument
     * as containing a secret. Update this list when new secret-bearing
     * flags are introduced (e.g. a future JWT bearer flag).
     */
    private static final Pattern SENSITIVE_KEY = Pattern.compile(
        "(?i)(?:flag|pass(?:word)?|secret|token|jwt|auth|api[_-]?key)(?:[_-].*)?"
    );

    /** Compiled {@code KEY=value} masker used by {@link #sanitizeMessage}. */
    private static final Pattern SENSITIVE_KV = Pattern.compile(
        "(?i)\\b((?:[A-Z][A-Z0-9_-]*_)?(?:FLAG|PASS(?:WORD)?|SECRET|TOKEN|JWT|AUTH|API[_-]?KEY)[A-Z0-9_-]*)="
            + "[^\\s,;}\"'\\\\]*"
    );

    /**
     * Replace any list-element that starts with a sensitive prefix
     * (e.g. {@code FLAG=abc123}) by {@code FLAG=[REDACTED]}. Order
     * and length are preserved so log line shape is comparable.
     */
    public static List<String> maskProcessArgs(List<String> args) {
        if (args == null) {
            return List.of();
        }
        List<String> out = new ArrayList<>(args.size());
        for (String a : args) {
            out.add(maskOne(a));
        }
        return out;
    }

    /**
     * Same contract as {@link #maskProcessArgs(List)} for callers
     * that already have a {@code String[]} (e.g. some {@code ProcessBuilder}
     * configurations or fixed-size callers). Returned array has the
     * same length as the input; null elements pass through unchanged.
     */
    public static String[] maskProcessArgs(String[] args) {
        if (args == null) {
            return new String[0];
        }
        String[] out = new String[args.length];
        for (int i = 0; i < args.length; i++) {
            out[i] = maskOne(args[i]);
        }
        return out;
    }

    private static String maskOne(String arg) {
        if (arg == null) {
            return null;
        }
        int separator = arg.indexOf('=');
        if (separator > 0) {
            String key = arg.substring(0, separator);
            if (SENSITIVE_KEY.matcher(key).matches() || key.matches("(?i).*_(?:PASSWORD|SECRET|TOKEN|JWT|AUTH)$")) {
                return key + "=[REDACTED]";
            }
        }
        return arg;
    }

    /**
     * Strip known sensitive {@code KEY=value} substrings from a
     * message (e.g. an exception toString()) so log sites can pass
     * messages straight to the logger. Non-KV occurrences are left
     * untouched (substring {@code FLAG}, not equal to {@code FLAG=},
     * is fine — we only redact values, never identifiers).
     */
    public static String sanitizeMessage(String message) {
        if (message == null) {
            return "null";
        }
        return SENSITIVE_KV.matcher(message).replaceAll("$1[REDACTED]");
    }

    /**
     * Convenience helper for Throwable.toString() chains — same
     * behavior as {@link #sanitizeMessage} but accepts null and
     * returns {@code "<unknown>"} when toString() yields empty.
     */
    public static String sanitizeThrowable(Throwable t) {
        if (t == null) {
            return "<none>";
        }
        String msg = t.getMessage();
        if (msg == null || msg.isBlank()) {
            return t.getClass().getSimpleName();
        }
        return t.getClass().getSimpleName() + ": " + sanitizeMessage(msg);
    }

    /** Removes control characters from values that are safe to identify in logs. */
    public static String sanitizeIdentifier(String value) {
        if (value == null) {
            return "<unknown>";
        }
        return value.replaceAll("[\\r\\n\\t]", "_");
    }
}
