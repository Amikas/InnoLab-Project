package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.ChallengeDto;
import at.fhtw.ctfbackend.services.ChallengeService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

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
        try {
            ChallengeDto challenge = challengeService.getChallengeById(id);
            return ResponseEntity.ok(challenge);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> download(@PathVariable String id) {
        try {
            // Get the challenge entity to access both file and filename
            byte[] data = challengeService.getFile(id);

            // Check if file data exists or is empty
            if (data == null || data.length == 0) {
                System.out.println("DEBUG: No file data found for challenge: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of(
                                "message", "No file available for this challenge",
                                "error", "FILE_NOT_FOUND"
                        ));
            }

            String filename = challengeService.getOriginalFilename(id);

            // Debug logging
            System.out.println("DEBUG: Challenge ID = " + id);
            System.out.println("DEBUG: Retrieved filename = '" + filename + "'");
            System.out.println("DEBUG: Is null? " + (filename == null));
            System.out.println("DEBUG: Is empty? " + (filename != null && filename.trim().isEmpty()));

            ByteArrayResource resource = new ByteArrayResource(data);

            // Better fallback logic
            if (filename == null || filename.trim().isEmpty()) {
                System.out.println("DEBUG: Falling back to file extension detection");
                String fileExtension = determineFileExtension(data);
                filename = id + fileExtension;
            }

            System.out.println("DEBUG: Final filename = '" + filename + "'");

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .body(resource);

        } catch (RuntimeException e) {
            // Return proper error response
            System.out.println("ERROR: Download failed for challenge: " + id + " - " + e.getMessage());

            if (e.getMessage().contains("Challenge not found")) {
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

    // Helper method to determine file extension from content
    private String determineFileExtension(byte[] data) {
        if (data == null || data.length < 4) return "";

        // Check for ZIP file signature
        if (data.length >= 4 && data[0] == 0x50 && data[1] == 0x4B && data[2] == 0x03 && data[3] == 0x04) {
            return ".zip";
        }
        // Check for PDF
        if (data.length >= 4 && data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46) {
            return ".pdf";
        }
        // Check for JPG
        if (data.length >= 3 && data[0] == (byte)0xFF && data[1] == (byte)0xD8 && data[2] == (byte)0xFF) {
            return ".jpg";
        }
        // Check for PNG
        if (data.length >= 8 && data[0] == (byte)0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47) {
            return ".png";
        }

        return ""; // Unknown type
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createChallenge(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam String category,
            @RequestParam String difficulty,
            @RequestParam Integer points,
            @RequestParam(required = false) String flag,
            @RequestParam(required = false) MultipartFile downloadFile,

            @RequestParam(required = false, defaultValue = "false") String requiresInstance,
            @RequestParam(required = false) MultipartFile[] dockerFiles,
            @RequestParam(required = false) String[] hints) {

        try {
            System.out.println("Creating challenge with parameters:");
            System.out.println("  title: " + title);
            System.out.println("  description: " + description);
            System.out.println("  category: " + category);
            System.out.println("  difficulty: " + difficulty);
            System.out.println("  points: " + points);
            System.out.println("  flag: " + (flag != null ? flag : "null"));
            System.out.println("  requiresInstance (raw): " + requiresInstance);
            System.out.println("  requiresInstance type: " + (requiresInstance != null ? requiresInstance.getClass().getName() : "null"));

            // Convert string to boolean
            Boolean requiresInstanceBoolean = Boolean.parseBoolean(requiresInstance);
            System.out.println("  requiresInstance (raw): " + requiresInstance);
            System.out.println("  requiresInstance (converted): " + requiresInstanceBoolean);
            System.out.println("  requiresInstance (converted type): " + (requiresInstanceBoolean != null ? requiresInstanceBoolean.getClass().getName() : "null"));
            System.out.println("  requiresInstance (converted value check): " + (requiresInstanceBoolean != null && requiresInstanceBoolean));

            // Additional debug: print all parameters
            System.out.println("=== DEBUG: All parameters received ===");
            System.out.println("title: " + title);
            System.out.println("description: " + description);
            System.out.println("category: " + category);
            System.out.println("difficulty: " + difficulty);
            System.out.println("points: " + points);
            System.out.println("flag: " + flag);

            System.out.println("requiresInstance (final): " + requiresInstanceBoolean);
            System.out.println("downloadFile: " + (downloadFile != null ? downloadFile.getOriginalFilename() : "null"));
            System.out.println("dockerFiles: " + (dockerFiles != null ? dockerFiles.length : 0));
            System.out.println("hints: " + (hints != null ? hints.length : 0));
            System.out.println("=== END DEBUG ===");

            ChallengeDto createdChallenge = challengeService.createChallenge(
                    title, description, category, difficulty, points, flag,
                    downloadFile, requiresInstanceBoolean, dockerFiles, hints
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(createdChallenge);

        } catch (Exception e) {
            System.err.println("Error creating challenge: " + e.getMessage());
            e.printStackTrace();
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
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) Integer points,
            @RequestParam(required = false) String flag,
            @RequestParam(required = false) MultipartFile downloadFile,

            @RequestParam(required = false) String requiresInstance,
            @RequestParam(required = false) MultipartFile[] dockerFiles,
            @RequestParam(required = false) String[] hints) {

        try {
            // Convert string to boolean for update as well
            Boolean requiresInstanceBoolean = requiresInstance != null ? Boolean.parseBoolean(requiresInstance) : null;
            
            ChallengeDto updatedChallenge = challengeService.updateChallenge(
                    id, title, description, category, difficulty, points, flag,
                    downloadFile, requiresInstanceBoolean, dockerFiles, hints
            );

            return ResponseEntity.ok(updatedChallenge);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChallenge(@PathVariable String id) {
        try {
            challengeService.deleteChallenge(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/admin/stats")
    public Map<String, Object> getAdminStats() {
        return challengeService.getAdminStats();
    }
}