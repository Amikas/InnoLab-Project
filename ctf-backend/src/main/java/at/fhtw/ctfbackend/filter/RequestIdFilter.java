package at.fhtw.ctfbackend.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Stamps every request with an X-Request-Id header and propagates
 * the value through SLF4J MDC under the key "requestId".
 *
 * <p>If the incoming request already carries an X-Request-Id (e.g.
 * from a reverse proxy or browser automation), that value is reused
 * (after a length sanity check) so request tracing is end-to-end.
 * Otherwise a UUID is generated.
 *
 * <p>The filter runs at {@link Ordered#HIGHEST_PRECEDENCE} so the
 * MDC value is available to every downstream filter and controller.
 * The MDC entry is always removed in a finally block so it does not
 * leak between requests on a pooled thread.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String MDC_KEY = "requestId";

    private static final String REQUEST_ID_PATTERN = "[A-Za-z0-9._-]{1,64}";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String id = request.getHeader(HEADER);
        if (id == null || !id.matches(REQUEST_ID_PATTERN)) {
            id = UUID.randomUUID().toString();
        }

        MDC.put(MDC_KEY, id);
        response.setHeader(HEADER, id);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
