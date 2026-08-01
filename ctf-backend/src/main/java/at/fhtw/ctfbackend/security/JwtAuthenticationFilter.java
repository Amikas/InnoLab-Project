package at.fhtw.ctfbackend.security;

import at.fhtw.ctfbackend.entity.UserEntity;
import at.fhtw.ctfbackend.services.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(
        JwtAuthenticationFilter.class
    );
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public JwtAuthenticationFilter(JwtUtil jwtUtil,
                                   UserService userService) {
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equals(request.getMethod());
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        if ("OPTIONS".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwtToken = extractTokenFromCookie(request);

        if (
            jwtToken != null &&
            SecurityContextHolder.getContext().getAuthentication() == null
        ) {
            if (jwtUtil.validateToken(jwtToken)) {
                try {
                    String username = jwtUtil.extractUsername(jwtToken);
                    logger.debug("Processing JWT token for user: {}", username);

                    if (username != null) {
                        Optional<UserEntity> userOpt = userService.findByUsername(
                            username
                        );

                        if (userOpt.isEmpty()) {
                            logger.debug(
                                "User not found in database: {}",
                                username
                            );
                            filterChain.doFilter(request, response);
                            return;
                        }

                        UserEntity user = userOpt.get();

                        if (
                            !Boolean.TRUE.equals(user.getIsActive())
                        ) {
                            logger.debug(
                                "User is inactive: {}",
                                username
                            );
                            filterChain.doFilter(request, response);
                            return;
                        }

                        boolean isAdmin = Boolean.TRUE.equals(
                            user.getIsAdmin()
                        );

                        List<SimpleGrantedAuthority> authorities = isAdmin
                            ? List.of(
                                new SimpleGrantedAuthority("ROLE_USER"),
                                new SimpleGrantedAuthority("ROLE_ADMIN")
                            )
                            : List.of(
                                new SimpleGrantedAuthority("ROLE_USER")
                            );

                        UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                authorities
                            );

                        authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(
                                request
                            )
                        );

                        SecurityContextHolder
                            .getContext()
                            .setAuthentication(authToken);
                        logger.debug(
                            "Authenticated user: {} (admin={})",
                            username,
                            isAdmin
                        );

                    }
                } catch (Exception ex) {
                    logger.debug(
                        "Failed to process JWT token",
                        ex
                    );
                }
            } else {
                logger.debug(
                    "Invalid or expired JWT token in auth_token cookie"
                );
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            return Arrays
                .stream(cookies)
                .filter(cookie -> "auth_token".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
        }
        return null;
    }
}
