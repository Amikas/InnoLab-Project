package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.dto.SolveResponse;
import at.fhtw.ctfbackend.entity.Solve;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SolveServiceSnapshotTest {

    @Mock private SolveRepository solveRepository;
    @Mock private ChallengeRepository challengeRepository;
    @Mock private UserService userService;

    private SolveService solveService;

    @BeforeEach
    void setUp() {
        solveService = new SolveService(solveRepository, challengeRepository, userService);
    }

    @Test
    void historyRowsMapFromStoredSnapshotWithoutChallengeLookup() {
        Solve solve = new Solve();
        solve.setId(1L);
        solve.setUsername("if24b120");
        solve.setChallengeId("test-challenge-1780756765716");
        solve.setChallengeTitle("Test Challenge");
        solve.setPointsEarned(100);

        when(solveRepository.findRecentSolves(any(Pageable.class))).thenReturn(List.of(solve));

        List<SolveResponse> result = solveService.getRecentSolves(4);

        assertEquals(1, result.size());
        assertEquals("test-challenge-1780756765716", result.get(0).getChallengeId());
        assertEquals("Test Challenge", result.get(0).getChallengeTitle());
        assertEquals(100, result.get(0).getPointsEarned());
        verifyNoInteractions(challengeRepository, userService);
    }
}
