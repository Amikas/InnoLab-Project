package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.ChallengeDto;
import at.fhtw.ctfbackend.services.ChallengeService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private static final Logger logger = LoggerFactory.getLogger(ChallengeController.class);

    private final ChallengeService challengeService;

    public ChallengeController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    @GetMapping
    public List<ChallengeDto> getChallenges() {
        return challengeService.listAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChallengeDto> getChallenge(@PathVariable String id) {
        return ResponseEntity.ok(challengeService.getChallengeById(id));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable String id) {
        try {
            ChallengeService.DownloadFile download = challengeService.getDownload(id);
            byte[] data = download.content();

            // Check if file data exists or is empty
            if (data == null || data.length == 0) {
                logger.debug("No file data found for challenge: {}", id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "message", "No file available for this challenge",
                                "error", "FILE_NOT_FOUND"
                        ));
            }

            String filename = download.filename();
            if (filename == null || filename.isBlank()) {
                filename = id + ".bin";
            }

            String contentDisposition = ContentDisposition.attachment()
                    .filename(filename, StandardCharsets.US_ASCII)
                    .build()
                    .toString();

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .body(new ByteArrayResource(data));

        } catch (RuntimeException e) {
            // Return proper error response
            logger.error("Download failed for challenge: {} - {}", id, e.getMessage());

            if (e.getMessage() != null && e.getMessage().contains("Challenge not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "message", "Challenge not found: " + id,
                                "error", "CHALLENGE_NOT_FOUND"
                        ));
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "message", "Download failed: " + e.getMessage(),
                                "error", "DOWNLOAD_ERROR"
                        ));
            }
        }
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createChallenge(
            @RequestParam String title,
            @RequestParam(required = false) String titleDe,
            @RequestParam String description,
            @RequestParam(required = false) String descriptionDe,
            @RequestParam String category,
            @RequestParam String difficulty,
            @RequestParam Integer points,
            @RequestParam(required = false) String flag,
            @RequestParam(required = false) MultipartFile downloadFile,

            @RequestParam(required = false, defaultValue = "false") String requiresInstance,
            @RequestParam(required = false) MultipartFile[] dockerFiles,
            @RequestParam(required = false) String[] hints,
            @RequestParam(required = false) String[] hintsDe) {

        try {
            logger.info("Creating challenge with parameters...");

            // Convert string to boolean
            Boolean requiresInstanceBoolean = Boolean.parseBoolean(requiresInstance);

            ChallengeDto createdChallenge = challengeService.createChallenge(
                    title, titleDe, description, descriptionDe, category, difficulty, points, flag,
                    downloadFile, requiresInstanceBoolean, dockerFiles, hints, hintsDe
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(createdChallenge);

        } catch (Exception e) {
            logger.error("Error creating challenge: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of(
                            "error", "Failed to create challenge",
                            "message", e.getMessage(),
                            "details", e.toString()
                    ));
        }
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChallengeDto> updateChallenge(
            @PathVariable String id,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String titleDe,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String descriptionDe,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) Integer points,
            @RequestParam(required = false) String flag,
            @RequestParam(required = false) MultipartFile downloadFile,

            @RequestParam(required = false) String requiresInstance,
            @RequestParam(required = false) MultipartFile[] dockerFiles,
            @RequestParam(required = false) String[] hints,
            @RequestParam(required = false) String[] hintsDe) {

        try {
            // Convert string to boolean for update as well
            Boolean requiresInstanceBoolean = requiresInstance != null ? Boolean.parseBoolean(requiresInstance) : null;
            
            ChallengeDto updatedChallenge = challengeService.updateChallenge(
                    id, title, titleDe, description, descriptionDe, category, difficulty, points, flag,
                    downloadFile, requiresInstanceBoolean, dockerFiles, hints, hintsDe
            );

            return ResponseEntity.ok(updatedChallenge);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChallenge(@PathVariable String id) {
        challengeService.deleteChallenge(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/admin/stats")
    public Map<String, Object> getAdminStats() {
        return challengeService.getAdminStats();
    }
}