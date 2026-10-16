package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.controller.ChallengeNotFoundException;
import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.HintRevealRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import at.fhtw.ctfbackend.repository.UserRepository;
import java.io.IOException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChallengeServiceDeleteTest {

    @Mock private ChallengeRepository challengeRepository;
    @Mock private ChallengeFileStorageService fileStorageService;
    @Mock private SolveRepository solveRepository;
    @Mock private HintRevealRepository hintRevealRepository;
    @Mock private EnvironmentService environmentService;
    @Mock private UserRepository userRepository;

    private ChallengeService challengeService;

    @BeforeEach
    void setUp() {
        challengeService = new ChallengeService(
                challengeRepository,
                fileStorageService,
                solveRepository,
                hintRevealRepository,
                environmentService,
                userRepository);
    }

    @Test
    void deleteUnknownChallengeThrowsChallengeNotFound() {
        when(challengeRepository.findById("missing")).thenReturn(Optional.empty());

        assertThrows(
                ChallengeNotFoundException.class,
                () -> challengeService.deleteChallenge("missing"));

        verifyNoInteractions(solveRepository, hintRevealRepository, environmentService, fileStorageService);
        verify(challengeRepository, never()).delete(any());
    }

    @Test
    void deleteChallengeSnapshotsSolvesAndRemovesDependents() throws IOException {
        ChallengeEntity challenge = ChallengeEntity.builder()
                .id("web-101")
                .title("Web 101")
                .build();
        when(challengeRepository.findById("web-101")).thenReturn(Optional.of(challenge));

        challengeService.deleteChallenge("web-101");

        verify(solveRepository).snapshotChallengeTitle("web-101", "Web 101");
        verify(hintRevealRepository).deleteByChallengeId("web-101");
        verify(environmentService).releaseInstancesForChallenge("web-101");
        verify(challengeRepository).delete(challenge);
        verify(fileStorageService).deleteChallengeFolder("web-101");
    }

    @Test
    void folderCleanupFailureDoesNotFailDelete() throws IOException {
        ChallengeEntity challenge = ChallengeEntity.builder()
                .id("web-101")
                .title("Web 101")
                .build();
        when(challengeRepository.findById("web-101")).thenReturn(Optional.of(challenge));
        doThrow(new IOException("permission denied"))
                .when(fileStorageService).deleteChallengeFolder("web-101");

        assertDoesNotThrow(() -> challengeService.deleteChallenge("web-101"));

        verify(challengeRepository).delete(challenge);
    }
}
