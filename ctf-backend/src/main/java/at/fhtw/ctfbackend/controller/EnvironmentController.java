package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.ChallengeInstanceResponse;
import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.services.EnvironmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/environment")
public class EnvironmentController {

    private final EnvironmentService envService;

    public EnvironmentController(EnvironmentService envService) {
        this.envService = envService;
    }

    // 1) Start environment for a challenge
    @PostMapping("/start/{challengeId}")
    public ResponseEntity<?> startEnvironment(
            Authentication auth,
            @PathVariable String challengeId
    ) {
        String username = auth.getName();

        ChallengeInstanceEntity inst = envService.startEnvironment(username, challengeId);

        ChallengeInstanceResponse response = new ChallengeInstanceResponse(
                inst.getInstanceId(),
                inst.getUsername(),
                inst.getChallengeId(),
                inst.getContainerName(),
                inst.getFlagHash(),
                inst.getCreatedAt(),
                inst.getExpiresAt(),
                inst.getStatus(),
                inst.getSshPort()
        );

        return ResponseEntity.ok(response);
    }

    // 2) Optional: Get instance status
    @GetMapping("/instance/{instanceId}")
    public ResponseEntity<?> getInstance(@PathVariable String instanceId) {
        var inst = envService.getInstance(instanceId);
        if (inst == null) {
            return ResponseEntity.notFound().build();
        }

        ChallengeInstanceResponse response = new ChallengeInstanceResponse(
                inst.getInstanceId(),
                inst.getUsername(),
                inst.getChallengeId(),
                inst.getContainerName(),
                inst.getFlagHash(),
                inst.getCreatedAt(),
                inst.getExpiresAt(),
                inst.getStatus(),
                inst.getSshPort()
        );

        return ResponseEntity.ok(response);
    }

    // 3) Optional: Stop environment
    @PostMapping("/stop/{instanceId}")
    public ResponseEntity<?> stopInstance(@PathVariable String instanceId) {
        boolean stopped = envService.stopEnvironment(instanceId);

        return ResponseEntity.ok(Map.of(
                "stopped", stopped
        ));
    }
    // 4) Build and start challenge environment
    @PostMapping("/build/{challengeId}")
    public ResponseEntity<?> buildAndStartChallenge(
            Authentication auth,
            @PathVariable String challengeId) {

        String username = auth.getName();

        try {
            ChallengeInstanceEntity inst = envService.buildAndStartChallenge(username, challengeId);

            ChallengeInstanceResponse response = new ChallengeInstanceResponse(
                    inst.getInstanceId(),
                    inst.getUsername(),
                    inst.getChallengeId(),
                    inst.getContainerName(),
                    inst.getFlagHash(),
                    inst.getCreatedAt(),
                    inst.getExpiresAt(),
                    inst.getStatus(),
                    inst.getSshPort()
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to build and start challenge",
                    "details", e.getMessage()
            ));
        }
    }
}
