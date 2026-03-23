package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.dto.SolveResponse;
import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.entity.Solve;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SolveService {

    private final SolveRepository solveRepository;
    private final ChallengeRepository challengeRepository;

    public SolveService(SolveRepository solveRepository, ChallengeRepository challengeRepository) {
        this.solveRepository = solveRepository;
        this.challengeRepository = challengeRepository;
    }

    /**
     * Record that a user has solved a challenge
     * @param username The username of the user who solved the challenge
     * @param challengeId The ID of the challenge that was solved
     * @param pointsEarned The points earned for solving the challenge
     * @return true if this is a new solve, false if the user already solved this challenge
     */
    @Transactional
    public boolean recordSolve(String username, String challengeId, int pointsEarned) {
        System.out.println(" SolveService.recordSolve called for user: " + username + ", challenge: " + challengeId);

        try {
            // Check if user already solved this challenge
            Optional<Solve> existingSolve = solveRepository.findByUsernameAndChallengeId(username, challengeId);

            if (existingSolve.isPresent()) {
                System.out.println("  User already solved this challenge, returning false");
                return false; // User already solved this challenge
            }

            System.out.println(" This is a new solve, creating database record...");

            // Get the challenge entity
            ChallengeEntity challenge = challengeRepository.findById(challengeId)
                    .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));

            // Create and save the new solve record
            Solve solve = new Solve(username, challenge, pointsEarned);
            Solve savedSolve = solveRepository.saveAndFlush(solve);  //  Changed from save() to saveAndFlush()

            System.out.println(" Solve saved to database with ID: " + savedSolve.getId());

            return true; // This is a new solve
        } catch (Exception e) {
            System.err.println(" Error in SolveService.recordSolve: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }

    /**
     * Get all challenges solved by a specific user
     * @param username The username to query
     * @return List of solved challenges with details
     */
    public List<SolveResponse> getSolvedChallengesByUser(String username) {
        return solveRepository.findByUsername(username).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get all users who solved a specific challenge
     * @param challengeId The challenge ID to query
     * @return List of solves for the challenge
     */
    public List<SolveResponse> getSolversForChallenge(String challengeId) {
        return solveRepository.findByChallengeId(challengeId).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Check if a user has solved a specific challenge
     * @param username The username to check
     * @param challengeId The challenge ID to check
     * @return true if the user has solved the challenge, false otherwise
     */
    public boolean hasUserSolvedChallenge(String username, String challengeId) {
        return solveRepository.findByUsernameAndChallengeId(username, challengeId).isPresent();
    }

    /**
     * Get the count of users who solved a specific challenge
     * @param challengeId The challenge ID to query
     * @return Number of users who solved the challenge
     */
    public long getSolveCountForChallenge(String challengeId) {
        System.out.println(" getSolveCountForChallenge called for: " + challengeId);

        // Try JPA query
        long countJpa = solveRepository.countByChallengeId(challengeId);
        System.out.println(" JPA Count result: " + countJpa);

        // Try native query
        long countNative = solveRepository.countByChallengeIdNative(challengeId);
        System.out.println(" Native Count result: " + countNative);

        // Use native for now since JPA seems broken
        return countNative;
    }

    /**
     * Get the count of challenges solved by a specific user
     * @param username The username to query
     * @return Number of challenges solved by the user
     */
    public long getSolveCountForUser(String username) {
        return solveRepository.countByUsername(username);
    }

    /**
     * Get recent solves (for activity feed/leaderboard)
     * @param limit Maximum number of recent solves to return
     * @return List of recent solves
     */
    public List<SolveResponse> getRecentSolves(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return solveRepository.findRecentSolves(pageable).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get top solvers by number of challenges solved
     * @param limit Maximum number of top solvers to return
     * @return Map of username to solve count
     */
    public Map<String, Long> getTopSolvers(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Object[]> results = solveRepository.findTopSolvers(pageable);
        return results.stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Long) result[1]
                ));
    }

    /**
     * Get most solved challenges
     * @param limit Maximum number of challenges to return
     * @return Map of challenge ID to solve count
     */

    public Map<String, Long> getMostSolvedChallenges(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        List<Object[]> results = solveRepository.findMostSolvedChallenges(pageable);
        return results.stream()
                .collect(Collectors.toMap(
                        result -> (String) result[0],
                        result -> (Long) result[1]
                ));
    }

    /**
     * Get solves by category
     * @param category The category to filter by
     * @return List of solves in the specified category
     */
    public List<SolveResponse> getSolvesByCategory(String category) {
        return solveRepository.findByCategory(category).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get solves by difficulty
     * @param difficulty The difficulty to filter by
     * @return List of solves with the specified difficulty
     */
    public List<SolveResponse> getSolvesByDifficulty(String difficulty) {
        return solveRepository.findByDifficulty(difficulty).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get solves within a time range
     * @param start Start time
     * @param end End time
     * @return List of solves within the time range
     */
    public List<SolveResponse> getSolvesByTimeRange(LocalDateTime start, LocalDateTime end) {
        return solveRepository.findBySolvedAtBetween(start, end).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get the total number of solves in the system
     * @return Total solve count
     */
    public long getTotalSolveCount() {
        return solveRepository.count();
    }

    /**
     * Get the solve record for a specific user and challenge
     * @param username The username
     * @param challengeId The challenge ID
     * @return Optional containing the solve record if it exists
     */
    public Optional<Solve> getSolveRecord(String username, String challengeId) {
        return solveRepository.findByUsernameAndChallengeId(username, challengeId);
    }

    /**
     * Delete a solve record (for administrative purposes)
     * @param solveId The ID of the solve record to delete
     */
    public void deleteSolve(Long solveId) {
        solveRepository.deleteById(solveId);
    }

    /**
     * Get statistics for a specific challenge
     * @param challengeId The challenge ID
     * @return Map containing various statistics about the challenge
     */
    public Map<String, Object> getChallengeStatistics(String challengeId) {
        System.out.println(" getChallengeStatistics called for challenge: " + challengeId);

        Map<String, Object> stats = new HashMap<>();

        long solveCount = getSolveCountForChallenge(challengeId);
        System.out.println(" Solve count from database: " + solveCount);

        ChallengeEntity challenge = challengeRepository.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));

        stats.put("challengeId", challengeId);
        stats.put("challengeTitle", challenge.getTitle());
        stats.put("solveCount", solveCount);
        stats.put("category", challenge.getCategory());
        stats.put("difficulty", challenge.getDifficulty());
        stats.put("points", challenge.getPoints());
        stats.put("solveRate", "N/A");

        System.out.println(" Returning stats: " + stats);

        return stats;
    }

    /**
     * Get statistics for a specific user
     * @param username The username
     * @return Map containing various statistics about the user
     */
    public Map<String, Object> getUserStatistics(String username) {
        Map<String, Object> stats = new HashMap<>();
        
        long totalSolves = getSolveCountForUser(username);
        List<SolveResponse> userSolves = getSolvedChallengesByUser(username);
        
        stats.put("username", username);
        stats.put("totalSolves", totalSolves);
        
        int totalPoints = userSolves.stream()
                .mapToInt(SolveResponse::getPointsEarned)
                .sum();
        stats.put("totalPoints", totalPoints);
        
        stats.put("categoryDistribution", Map.of());
        stats.put("difficultyDistribution", Map.of());
        
        return stats;
    }

    private SolveResponse toDto(Solve solve) {
        return new SolveResponse(
                solve.getId(),
                solve.getUsername(),
                solve.getChallenge().getId(),
                solve.getChallenge().getTitle(),
                solve.getSolvedAt(),
                solve.getPointsEarned()
        );
    }
}