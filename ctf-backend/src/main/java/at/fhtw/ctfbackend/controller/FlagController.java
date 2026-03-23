package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.SubmitFlagRequestDto;
import at.fhtw.ctfbackend.services.FlagService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/flags")
public class FlagController {

    private final FlagService flagService;

    public FlagController(FlagService flagService) {
        this.flagService = flagService;
    }

    @PostMapping("/submit")
    @Transactional  //  Add this annotation
    public ResponseEntity<Map<String, Object>> submitFlag(
            Authentication auth,
            @RequestBody SubmitFlagRequestDto request) {

        String username = auth.getName();
        String challengeId = request.getChallengeId();
        String submittedFlag = request.getFlag();

        System.out.println("Got into controller!");

        // NEW: validate using dynamic instance flag
        boolean valid = flagService.validateFlag(username, challengeId, submittedFlag);

        if (!valid) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message", "Incorrect flag.",
                            "status",  "error"
                    ));
        }

        // NEW: Check if user already solved this challenge
        boolean alreadySolved = flagService.hasUserSolvedChallenge(username, challengeId);

        if (alreadySolved) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message", "Flag already submitted.",
                            "status",  "warning"
                    ));
        }

        // NEW: record that user solved the challenge
        boolean isNewSolve = flagService.recordSolve(username, challengeId);

        if (!isNewSolve) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message", "Failed to record solve.",
                            "status",  "error"
                    ));
        }

        //  Get the updated solve count AFTER the transaction commits
        long solveCount = flagService.getSolveCountForChallenge(challengeId);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("message", "Correct flag!");
        response.put("status", "success");
        response.put("solveCount", solveCount);

        return ResponseEntity.ok(response);
    }
}
