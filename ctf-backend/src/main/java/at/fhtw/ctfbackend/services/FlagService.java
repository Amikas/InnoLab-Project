package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.entity.UserEntity;
import at.fhtw.ctfbackend.repository.ChallengeInstanceRepository;
import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import org.springframework.stereotype.Service;

import at.fhtw.ctfbackend.logging.LogSafe;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FlagService {

    private final ChallengeInstanceRepository instanceRepo;
    private final EnvironmentService envService;
    private final ChallengeRepository challengeRepo;
    private final SolveService solveService;
    private final HintService hintService;
    private final UserService userService;

    private static final Logger logger = LoggerFactory.getLogger(FlagService.class);

    public FlagService(ChallengeInstanceRepository instanceRepo, EnvironmentService envService, 
            ChallengeRepository challengeRepo, SolveService solveService, HintService hintService, UserService userService) {
        this.instanceRepo = instanceRepo;
        this.envService = envService;
        this.challengeRepo = challengeRepo;
        this.solveService = solveService;
        this.hintService = hintService;
        this.userService = userService;
    }

    public boolean validateFlag(String username, String challengeId, String submittedFlag) {
        logger.debug(" Validating flag for user: {}, challenge: {}", username, challengeId);

        try {
            // 1. First, get the challenge
            ChallengeEntity challenge = challengeRepo.findById(challengeId)
                    .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));

            // 2. Use the explicit requiresInstance field from the challenge
            boolean requiresInstance = challenge.isRequiresInstance();

            boolean isValid;

            // 3. Route to appropriate validation
            if (requiresInstance) {
                isValid = validateDynamicFlag(username, challengeId, submittedFlag);
            } else {
                isValid = validateStaticFlag(challenge, submittedFlag);
            }

            return isValid;
        } catch (Exception e) {
            // SECURITY: never include the submitted flag value itself in any
            // log message — it is the caller-controlled input that could be
            // tuned to overflow or embed a server log trigger.
            int submittedLen = (submittedFlag == null) ? -1 : submittedFlag.length();
            logger.error("Flag validation failed: challengeId={} submittedLength={} cause={}",
                    challengeId, submittedLen, LogSafe.sanitizeThrowable(e));
            return false;
        }
    }

    private boolean validateDynamicFlag(String username, String challengeId, String submittedFlag) {
        UserEntity user = userService.getRequiredUser(username);
        var instances = instanceRepo.findByUserAndChallengeIdAndStatus(
                user, challengeId, "RUNNING"
        );

        if (instances.isEmpty()) {
            logger.warn("No running instance found for dynamic challenge");
            return false;
        }

        ChallengeInstanceEntity inst = instances.get(0);
        String submittedHash = envService.sha256(submittedFlag);
        boolean isValid = submittedHash.equals(inst.getFlagHash());



        return isValid;
    }

    private boolean validateStaticFlag(ChallengeEntity challenge, String submittedFlag) {
        // For static challenges, compare directly with stored flag
        if (challenge.getFlag() == null || submittedFlag == null) {
            return false;
        }

        // Direct string comparison for static challenges
        boolean isValid = challenge.getFlag().equals(submittedFlag);



        return isValid;
    }
    private final Map<String, Set<String>> solvedByUser = new ConcurrentHashMap<>();

    public boolean recordSolve(String username, String challengeId) {
        try {
            Set<String> solved = solvedByUser.computeIfAbsent(username,
                    __ -> ConcurrentHashMap.newKeySet());
            boolean isNewSolve = solved.add(challengeId);

            if (isNewSolve) {
                ChallengeEntity challenge = challengeRepo.findById(challengeId)
                        .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));
                
                int basePoints = challenge.getPoints() != null ? challenge.getPoints() : 0;
                int penaltyPercent = hintService.calculatePenaltyPercent(username, challengeId);
                int pointsEarned = basePoints * (100 - penaltyPercent) / 100;
                
                boolean dbSuccess = solveService.recordSolve(username, challengeId, pointsEarned);
                
                if (dbSuccess) {
                    logger.info(" Solve recorded for user: {}, challenge: {}", username, challengeId);
                } else {
                    logger.error(" Failed to record solve in database");
                    solved.remove(challengeId);
                    isNewSolve = false;
                }
            } else {
                logger.info("User already solved this challenge, skipping database record");
            }

            return isNewSolve;
        } catch (Exception e) {
            logger.error("Error recording solve: {}", e.getMessage(), e);
            return false;
        }
    }

    public Set<String> getSolvedChallenges(String username) {
        Set<String> solved = solvedByUser.getOrDefault(username, Collections.emptySet());
        return Collections.unmodifiableSet(solved);
    }


    /**
     * Check if a user has solved a specific challenge (using database)
     * @param username The username to check
     * @param challengeId The challenge ID to check
     * @return true if the user has solved the challenge, false otherwise
     */
    public boolean hasUserSolvedChallenge(String username, String challengeId) {
        return solveService.hasUserSolvedChallenge(username, challengeId);
    }

    /**
     * Get the count of users who solved a specific challenge
     * @param challengeId The challenge ID to query
     * @return Number of users who solved the challenge
     */
    public long getSolveCountForChallenge(String challengeId) {
        return solveService.getSolveCountForChallenge(challengeId);
    }

    public int getPointsEarned(String username, String challengeId) {
        return solveService.getPointsEarned(username, challengeId);
    }
}
