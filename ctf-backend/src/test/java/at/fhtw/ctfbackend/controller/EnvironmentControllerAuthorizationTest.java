package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.config.GlobalMockConfig;
import at.fhtw.ctfbackend.config.TestSecurityConfig;
import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.entity.UserEntity;
import at.fhtw.ctfbackend.security.JwtUtil;
import at.fhtw.ctfbackend.services.EnvironmentService;
import at.fhtw.ctfbackend.services.UserService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(
        controllers = EnvironmentController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = at.fhtw.ctfbackend.config.SecurityConfig.class
        )
)
@Import({GlobalMockConfig.class, TestSecurityConfig.class})
class EnvironmentControllerAuthorizationTest {

    private static final String TEST_SECRET = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EnvironmentService environmentService;

    @Autowired
    private UserService userService;

    private final JwtUtil jwtUtil = new JwtUtil(TEST_SECRET);

    private ChallengeInstanceEntity ownerInstance(String username) {
        ChallengeInstanceEntity inst = new ChallengeInstanceEntity();
        inst.setInstanceId("inst-1");
        inst.setUsername(username);
        inst.setContainerName("ctf-abc12345");
        inst.setStatus("RUNNING");
        inst.setSshPort(30001);
        return inst;
    }

    private Cookie authCookie(String username) {
        return new Cookie("auth_token", jwtUtil.generateToken(username, false));
    }

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.reset(environmentService, userService);
        UserEntity activeUser = UserEntity.builder()
                .username("placeholder")
                .isAdmin(false)
                .isActive(true)
                .build();
        when(userService.findByUsername(anyString())).thenReturn(Optional.of(activeUser));
    }

    @Test
    void ownerCanReadOwnInstance() throws Exception {
        when(environmentService.getInstance(eq("userA"), eq("inst-1"))).thenReturn(ownerInstance("userA"));

        mockMvc.perform(get("/api/environment/instance/inst-1").cookie(authCookie("userA")))
                .andExpect(status().isOk());
    }

    @Test
    void otherUserCannotReadInstance_returnsNotFound() throws Exception {
        when(environmentService.getInstance(eq("userB"), eq("inst-1"))).thenReturn(null);

        mockMvc.perform(get("/api/environment/instance/inst-1").cookie(authCookie("userB")))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownerCanStopOwnInstance() throws Exception {
        when(environmentService.stopEnvironment(eq("userA"), eq("inst-1")))
                .thenReturn(new EnvironmentService.StopResult(true, true, true, null));

        mockMvc.perform(post("/api/environment/stop/inst-1").cookie(authCookie("userA")))
                .andExpect(status().isOk());
    }

    @Test
    void otherUserCannotStopInstance_returnsNotFound() throws Exception {
        when(environmentService.stopEnvironment(eq("userB"), eq("inst-1")))
                .thenReturn(new EnvironmentService.StopResult(false, false, false, "Instance not found: inst-1"));

        mockMvc.perform(post("/api/environment/stop/inst-1").cookie(authCookie("userB")))
                .andExpect(status().isNotFound());
    }

    @Test
    void buildAndStartFailure_returnsCuratedUserMessageAndStatus() throws Exception {
        when(environmentService.buildAndStartChallenge(eq("userA"), eq("chal-1")))
                .thenThrow(new EnvironmentStartException(
                        "All environment slots are currently in use. Please stop an existing environment or try again in a few minutes.",
                        "No available ports in range 30000-31000",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        null));

        mockMvc.perform(post("/api/environment/build/chal-1").cookie(authCookie("userA")))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error")
                        .value("All environment slots are currently in use. Please stop an existing environment or try again in a few minutes."));
    }
}
