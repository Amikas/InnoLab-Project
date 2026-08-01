package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.controller.EnvironmentStartException;
import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import org.springframework.http.HttpStatus;
import at.fhtw.ctfbackend.repository.ChallengeInstanceRepository;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.services.EnvironmentService.StopResult;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnvironmentServiceAuthorizationTest {

    @Mock
    private ChallengeInstanceRepository instanceRepo;

    @Mock
    private DockerService dockerService;

    @Mock
    private ChallengeRepository challengeRepo;

    @Mock
    private UserService userService;

    private EnvironmentService environmentService;

    private ChallengeInstanceEntity ownedInstance() {
        ChallengeInstanceEntity inst = new ChallengeInstanceEntity();
        inst.setInstanceId("inst-1");
        inst.setUsername("userA");
        inst.setContainerName("ctf-abc12345");
        inst.setStatus("RUNNING");
        inst.setSshPort(30001);
        return inst;
    }

    @BeforeEach
    void setUp() {
        environmentService = new EnvironmentService(instanceRepo, dockerService, challengeRepo, userService);
        lenient().when(instanceRepo.findAll()).thenReturn(List.of());
    }

    @Test
    void getInstance_ownerReturnsInstance() {
        ChallengeInstanceEntity inst = ownedInstance();
        when(instanceRepo.findByInstanceId("inst-1")).thenReturn(Optional.of(inst));

        ChallengeInstanceEntity result = environmentService.getInstance("userA", "inst-1");

        assertNotNull(result);
        assertEquals("userA", result.getUsername());
    }

    @Test
    void getInstance_otherUserReturnsNull() {
        ChallengeInstanceEntity inst = ownedInstance();
        when(instanceRepo.findByInstanceId("inst-1")).thenReturn(Optional.of(inst));

        assertNull(environmentService.getInstance("userB", "inst-1"));
    }

    @Test
    void getInstance_missingInstanceReturnsNull() {
        when(instanceRepo.findByInstanceId("missing")).thenReturn(Optional.empty());

        assertNull(environmentService.getInstance("userA", "missing"));
    }

    @Test
    void stopEnvironment_ownerProceedsAndStopsContainer() {
        ChallengeInstanceEntity inst = ownedInstance();
        when(instanceRepo.findByInstanceId("inst-1")).thenReturn(Optional.of(inst));

        StopResult result = environmentService.stopEnvironment("userA", "inst-1");

        assertTrue(result.accessible());
        verify(dockerService).stopContainer("ctf-abc12345");
    }

    @Test
    void stopEnvironment_otherUserReturnsNotFoundAndDoesNotStopContainer() {
        ChallengeInstanceEntity inst = ownedInstance();
        when(instanceRepo.findByInstanceId("inst-1")).thenReturn(Optional.of(inst));

        StopResult result = environmentService.stopEnvironment("userB", "inst-1");

        assertFalse(result.accessible());
        verify(dockerService, never()).stopContainer(anyString());
    }

    @Test
    void stopEnvironment_missingInstanceReturnsNotFound() {
        when(instanceRepo.findByInstanceId("missing")).thenReturn(Optional.empty());

        assertFalse(environmentService.stopEnvironment("userA", "missing").accessible());
    }

    // --- buildAndStartChallenge failure mapping ---

    @Test
    void toUserFriendly_dockerDaemonUnreachable_isUserSafeAnd503() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("Docker run failed with exit code 125:\nCannot connect to the Docker daemon at unix:///var/run/docker.sock"));

        assertEquals("The environment service is temporarily unavailable. Please try again in a few minutes.",
                ex.getUserMessage());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, ex.getStatus());
    }

    @Test
    void toUserFriendly_missingDockerfile_tellsUserToContactAdmin() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("No Dockerfile found for challenge: test. Checked: docker/Dockerfile, ..."));

        assertEquals("This challenge's environment is not set up correctly. Please contact an administrator.",
                ex.getUserMessage());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatus());
    }

    @Test
    void toUserFriendly_buildFailure_tellsUserItCouldNotBeBuilt() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("Docker build failed with exit code 1:\nRUN apt-get update failed"));

        assertEquals("The environment could not be built or started. Please try again or contact an administrator.",
                ex.getUserMessage());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatus());
    }

    @Test
    void toUserFriendly_missingNetwork_tellsUserNetworkCouldNotBeCreated() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("Failed to ensure Docker network 'ctf-network': network ctf-network not found"));

        assertEquals("The challenge network could not be created. Please contact an administrator.",
                ex.getUserMessage());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatus());
    }

    @Test
    void toUserFriendly_unknownFailure_fallsBackToGenericMessage() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("some unexpected internal error"));

        assertEquals("Something went wrong while starting your environment. Please try again in a few minutes.",
                ex.getUserMessage());
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, ex.getStatus());
    }

    @Test
    void toUserFriendly_neverLeaksTechnicalDetailInUserMessage() {
        EnvironmentStartException ex = EnvironmentService.toUserFriendly(
                new RuntimeException("Docker build failed with exit code 1:\n/opt/ctf/backend/challenges/secret/path"));

        assertFalse(ex.getUserMessage().contains("/opt/ctf"));
        assertFalse(ex.getUserMessage().contains("secret"));
    }
}
