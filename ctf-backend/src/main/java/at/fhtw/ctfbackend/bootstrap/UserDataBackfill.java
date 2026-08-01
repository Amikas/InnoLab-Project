package at.fhtw.ctfbackend.bootstrap;

import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.entity.HintReveal;
import at.fhtw.ctfbackend.entity.Solve;
import at.fhtw.ctfbackend.entity.UserEntity;
import at.fhtw.ctfbackend.repository.ChallengeInstanceRepository;
import at.fhtw.ctfbackend.repository.HintRevealRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import at.fhtw.ctfbackend.repository.UserRepository;
import at.fhtw.ctfbackend.services.UserService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class UserDataBackfill implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SolveRepository solveRepository;
    private final HintRevealRepository hintRevealRepository;
    private final ChallengeInstanceRepository challengeInstanceRepository;
    private final UserService userService;

    public UserDataBackfill(
            UserRepository userRepository,
            SolveRepository solveRepository,
            HintRevealRepository hintRevealRepository,
            ChallengeInstanceRepository challengeInstanceRepository,
            UserService userService
    ) {
        this.userRepository = userRepository;
        this.solveRepository = solveRepository;
        this.hintRevealRepository = hintRevealRepository;
        this.challengeInstanceRepository = challengeInstanceRepository;
        this.userService = userService;
    }

    @Override
    @Transactional
    public void run(String... args) {
        backfillUsers();
        backfillSolves();
        backfillHintReveals();
        backfillChallengeInstances();
    }

    private void backfillUsers() {
        for (UserEntity user : userRepository.findAll()) {
            String normalizedUsername = userService.normalizeUsername(user.getUsername());
            user.setUsername(normalizedUsername);
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                user.setEmail(normalizedUsername + "@technikum-wien.at");
            }
            if (user.getDisplayName() == null || user.getDisplayName().isBlank()) {
                user.setDisplayName(normalizedUsername);
            }
        }
    }

    private void backfillSolves() {
        for (Solve solve : solveRepository.findAll()) {
            if (solve.getUser() != null) {
                continue;
            }

            UserEntity user = getOrCreateUser(solve.getUsername());
            solve.setUser(user);
            solve.setUsername(user.getUsername());
        }
    }

    private void backfillHintReveals() {
        for (HintReveal reveal : hintRevealRepository.findAll()) {
            if (reveal.getUser() != null) {
                continue;
            }

            UserEntity user = getOrCreateUser(reveal.getUsername());
            reveal.setUser(user);
            reveal.setUsername(user.getUsername());
        }
    }

    private void backfillChallengeInstances() {
        for (ChallengeInstanceEntity instance : challengeInstanceRepository.findAll()) {
            if (instance.getUser() != null) {
                continue;
            }

            UserEntity user = getOrCreateUser(instance.getUsername());
            instance.setUser(user);
            instance.setUsername(user.getUsername());
        }
    }

    private UserEntity getOrCreateUser(String username) {
        String normalizedUsername = userService.normalizeUsername(username);
        return userRepository.findByUsername(normalizedUsername)
                .orElseGet(() -> userRepository.save(UserEntity.builder()
                        .username(normalizedUsername)
                        .email(normalizedUsername + "@technikum-wien.at")
                        .displayName(normalizedUsername)
                        .isAdmin(false)
                        .isActive(true)
                        .build()));
    }
}
