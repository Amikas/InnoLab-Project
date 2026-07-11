package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
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
}
