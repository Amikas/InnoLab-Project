package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.HintRevealRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import at.fhtw.ctfbackend.repository.UserRepository;
import java.util.Map;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChallengeServiceStatsTest {

    @Mock private ChallengeRepository challengeRepository;
    @Mock private ChallengeFileStorageService fileStorageService;
    @Mock private SolveRepository solveRepository;
    @Mock private HintRevealRepository hintRevealRepository;
    @Mock private EnvironmentService environmentService;
    @Mock private UserRepository userRepository;

    @InjectMocks private ChallengeService challengeService;

    @ParameterizedTest
    @CsvSource({"42, 137", "0, 0"})
    void getAdminStatsReturnsDatabaseCounts(long users, long submissions) {
        when(userRepository.count()).thenReturn(users);
        when(solveRepository.count()).thenReturn(submissions);

        Map<String, Object> stats = challengeService.getAdminStats();

        assertEquals(users, stats.get("totalUsers"));
        assertEquals(submissions, stats.get("totalSubmissions"));
        verify(userRepository).count();
        verify(solveRepository).count();
    }
}
