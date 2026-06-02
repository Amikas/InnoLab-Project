package at.fhtw.ctfbackend.config;

import at.fhtw.ctfbackend.security.JwtUtil;
import at.fhtw.ctfbackend.services.CategoryService;
import at.fhtw.ctfbackend.services.ChallengeService;
import at.fhtw.ctfbackend.services.FileService;
import at.fhtw.ctfbackend.services.FlagService;

import org.mockito.Mockito;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

@TestConfiguration(proxyBeanMethods = false)
public class GlobalMockConfig {

    @Bean
    public CategoryService categoryService() {
        return Mockito.mock(CategoryService.class);
    }

    @Bean
    public ChallengeService challengeService() {
        return Mockito.mock(ChallengeService.class);
    }

    @Bean
    public FlagService flagService() {
        return Mockito.mock(FlagService.class);
    }

    @Bean
    public FileService fileService() {
        return Mockito.mock(FileService.class);
    }

    @Bean
    public JwtUtil jwtUtil() {
        return Mockito.mock(JwtUtil.class);
    }

    @Bean
    public RateLimitConfig rateLimitConfig() {
        return Mockito.mock(RateLimitConfig.class);
    }
}
