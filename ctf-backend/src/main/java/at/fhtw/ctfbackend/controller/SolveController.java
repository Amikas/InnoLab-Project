package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.SolveResponse;
import at.fhtw.ctfbackend.services.SolveService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/solves")
public class SolveController {

    private final SolveService solveService;

    public SolveController(SolveService solveService) {
        this.solveService = solveService;
    }

    /**
     * Get all challenges solved by the authenticated user
     * @param auth Authentication object containing username
     * @return List of solved challenges
     */
    @GetMapping("/me")
    public ResponseEntity<List<SolveResponse>> getMySolves(Authentication auth) {
        String username = auth.getName();
        List<SolveResponse> solves = solveService.getSolvedChallengesByUser(username);
        return ResponseEntity.ok(solves);
    }

    /**
     * Get all users who solved a specific challenge
     * @param challengeId The challenge ID
     * @return List of solves for the challenge
     */
    @GetMapping("/challenge/{challengeId}")
    public ResponseEntity<List<SolveResponse>> getSolversForChallenge(@PathVariable String challengeId) {
        List<SolveResponse> solves = solveService.getSolversForChallenge(challengeId);
        return ResponseEntity.ok(solves);
    }

    /**
     * Check if the authenticated user has solved a specific challenge
     * @param auth Authentication object containing username
     * @param challengeId The challenge ID to check
     * @return Boolean indicating if user solved the challenge
     */
    @GetMapping("/check/{challengeId}")
    public ResponseEntity<Map<String, Boolean>> checkIfSolved(
            Authentication auth, 
            @PathVariable String challengeId) {
        
        String username = auth.getName();
        boolean hasSolved = solveService.hasUserSolvedChallenge(username, challengeId);
        
        return ResponseEntity.ok(Map.of("solved", hasSolved));
    }

    /**
     * Get the number of users who solved a specific challenge
     * @param challengeId The challenge ID
     * @return Count of solvers
     */
    @GetMapping("/challenge/{challengeId}/count")
    public ResponseEntity<Map<String, Long>> getSolveCountForChallenge(@PathVariable String challengeId) {
        long count = solveService.getSolveCountForChallenge(challengeId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /**
     * Get recent solves (for activity feed)
     * @param limit Maximum number of recent solves to return (default: 10)
     * @return List of recent solves
     */
    @GetMapping("/recent")
    public ResponseEntity<List<SolveResponse>> getRecentSolves(@RequestParam(defaultValue = "10") int limit) {
        List<SolveResponse> recentSolves = solveService.getRecentSolves(limit);
        return ResponseEntity.ok(recentSolves);
    }

    /**
     * Get top solvers by number of challenges solved
     * @param limit Maximum number of top solvers to return (default: 10)
     * @return Map of username to solve count
     */
    @GetMapping("/top-solvers")
    public ResponseEntity<Map<String, Long>> getTopSolvers(@RequestParam(defaultValue = "10") int limit) {
        Map<String, Long> topSolvers = solveService.getTopSolvers(limit);
        return ResponseEntity.ok(topSolvers);
    }

    /**
     * Get most solved challenges
     * @param limit Maximum number of challenges to return (default: 10)
     * @return Map of challenge ID to solve count
     */
    @GetMapping("/most-solved")
    public ResponseEntity<Map<String, Long>> getMostSolvedChallenges(@RequestParam(defaultValue = "10") int limit) {
        Map<String, Long> mostSolved = solveService.getMostSolvedChallenges(limit);
        return ResponseEntity.ok(mostSolved);
    }

    /**
     * Get solves by category
     * @param category The category to filter by
     * @return List of solves in the specified category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<SolveResponse>> getSolvesByCategory(@PathVariable String category) {
        List<SolveResponse> solves = solveService.getSolvesByCategory(category);
        return ResponseEntity.ok(solves);
    }

    /**
     * Get solves by difficulty
     * @param difficulty The difficulty to filter by
     * @return List of solves with the specified difficulty
     */
    @GetMapping("/difficulty/{difficulty}")
    public ResponseEntity<List<SolveResponse>> getSolvesByDifficulty(@PathVariable String difficulty) {
        List<SolveResponse> solves = solveService.getSolvesByDifficulty(difficulty);
        return ResponseEntity.ok(solves);
    }

    /**
     * Get solves within a time range
     * @param start Start time (ISO format)
     * @param end End time (ISO format)
     * @return List of solves within the time range
     */
    @GetMapping("/time-range")
    public ResponseEntity<List<SolveResponse>> getSolvesByTimeRange(
            @RequestParam String start,
            @RequestParam String end) {
        
        LocalDateTime startTime = LocalDateTime.parse(start);
        LocalDateTime endTime = LocalDateTime.parse(end);
        
        List<SolveResponse> solves = solveService.getSolvesByTimeRange(startTime, endTime);
        return ResponseEntity.ok(solves);
    }

    /**
     * Get statistics for a specific challenge
     * @param challengeId The challenge ID
     * @return Map containing various statistics about the challenge
     */
    @GetMapping("/challenge/{challengeId}/stats")
    public ResponseEntity<Map<String, Object>> getChallengeStatistics(@PathVariable String challengeId) {
        System.out.println(" Controller: getChallengeStatistics endpoint called for: " + challengeId);
        Map<String, Object> stats = solveService.getChallengeStatistics(challengeId);
        System.out.println(" Controller: Returning stats: " + stats);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get statistics for the authenticated user
     * @param auth Authentication object containing username
     * @return Map containing various statistics about the user
     */
    @GetMapping("/me/stats")
    public ResponseEntity<Map<String, Object>> getUserStatistics(Authentication auth) {
        String username = auth.getName();
        Map<String, Object> stats = solveService.getUserStatistics(username);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get statistics for a specific user (admin only)
     * @param username The username to query
     * @return Map containing various statistics about the user
     */
    @GetMapping("/user/{username}/stats")
    public ResponseEntity<Map<String, Object>> getUserStatisticsByUsername(@PathVariable String username) {
        Map<String, Object> stats = solveService.getUserStatistics(username);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get total number of solves in the system
     * @return Total solve count
     */
    @GetMapping("/total-count")
    public ResponseEntity<Map<String, Long>> getTotalSolveCount() {
        long totalCount = solveService.getTotalSolveCount();
        return ResponseEntity.ok(Map.of("totalSolves", totalCount));
    }
}