package at.fhtw.ctfbackend.filter;

import at.fhtw.ctfbackend.config.RateLimitConfig;
import at.fhtw.ctfbackend.security.JwtUtil;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.Marker;
import org.slf4j.MarkerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimitConfig rateLimitConfig;
    private final JwtUtil jwtUtil;

    private static final List<String> EXCLUDED_PATHS = List.of(
            "/api/health"
    );

    /** Marker so denials are easy to filter with `grep AUDIT`. */
    private static final Marker AUDIT = MarkerFactory.getMarker("AUDIT");
    private static final int MAX_AUDIT_KEYS = 10_000;
    private final ConcurrentHashMap<String, Long> auditUntil = new ConcurrentHashMap<>();

    public RateLimitFilter(RateLimitConfig rateLimitConfig, JwtUtil jwtUtil) {
        this.rateLimitConfig = rateLimitConfig;
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!rateLimitConfig.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = request.getRequestURI();
        if (isExcluded(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String rateLimitKey = extractRateLimitKey(request, path);
        Bucket bucket = rateLimitConfig.resolveBucket(rateLimitKey, path);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));

        if (probe.isConsumed()) {
            filterChain.doFilter(request, response);
        } else {
            long waitTimeSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;
            logRateLimitDenial(rateLimitKey, path, waitTimeSeconds);
            response.setHeader("Retry-After", String.valueOf(waitTimeSeconds));
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Rate limit exceeded. Please try again later.\",\"retryAfter\":" + waitTimeSeconds + "}");
        }
    }

    private String extractRateLimitKey(HttpServletRequest request, String path) {
        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.validateToken(token)) {
                String username = jwtUtil.extractUsername(token);
                return "user:" + username;
            }
        }

        return "ip:" + request.getRemoteAddr();
    }

    private boolean isExcluded(String path) {
        return EXCLUDED_PATHS.stream().anyMatch(path::startsWith);
    }

    private void logRateLimitDenial(String rateLimitKey, String path, long waitTimeSeconds) {
        String auditKey = rateLimitKey + "|" + path;
        long now = System.currentTimeMillis();
        long until = now + Math.max(1, waitTimeSeconds) * 1_000L;
        if (auditUntil.size() >= MAX_AUDIT_KEYS) {
            auditUntil.entrySet().removeIf(entry -> entry.getValue() <= now);
        }
        if (auditUntil.size() >= MAX_AUDIT_KEYS && !auditUntil.containsKey(auditKey)) {
            return;
        }
        // Compute the dedupe decision first (atomic map mutation), then log
        // OUTSIDE the map operation so file/console I/O never runs while
        // holding the ConcurrentHashMap bin lock on the denial hot path.
        boolean[] shouldLog = {false};
        auditUntil.compute(auditKey, (key, previousUntil) -> {
            if (previousUntil == null || previousUntil <= now) {
                shouldLog[0] = true;
                return until;
            }
            return previousUntil;
        });
        if (shouldLog[0]) {
            log.warn(AUDIT, "Rate limit exceeded key={} path={} retryAfterSec={}",
                    rateLimitKey, path, waitTimeSeconds);
        }
    }
}
