package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.dto.ChallengeDto;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChallengeService {

    private final ChallengeRepository repo;
    private final ChallengeFileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public ChallengeService(ChallengeRepository repo, ChallengeFileStorageService fileStorageService) {
        this.repo = repo;
        this.fileStorageService = fileStorageService;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * List all challenges for the API.
     */
    public List<ChallengeDto> listAll() {
        return repo.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Load the file bytes for a given challenge.
     */
    @Transactional(readOnly = true)
    public byte[] getFile(String challengeId) {
        return repo.findById(challengeId)
                .map(ChallengeEntity::getDownloadZip)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));
    }

    @Transactional
    public ChallengeDto createChallenge(String title, String description, String category,
                                     String difficulty, Integer points, String flag,
                                     MultipartFile downloadFile,
                                     Boolean requiresInstance,
                                     MultipartFile[] dockerFiles,
                                     String[] hints) throws IOException {

        String challengeId = title.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "") + "-" + System.currentTimeMillis();

        // Create challenge folder
        String challengeFolderPath = fileStorageService.createChallengeFolder(challengeId);
        System.out.println("Created challenge folder: " + challengeFolderPath);

        // Save Docker files if provided
        List<String> savedFiles = new ArrayList<>();
        if (dockerFiles != null && dockerFiles.length > 0) {
            savedFiles = fileStorageService.saveDockerFiles(challengeId, dockerFiles);
            System.out.println("Saved " + savedFiles.size() + " Docker files for challenge: " + challengeId);
        }

        // Save download file if provided
        byte[] downloadBytes = null;
        String originalFilename = null;
        if (downloadFile != null && !downloadFile.isEmpty()) {
            downloadBytes = downloadFile.getBytes();
            originalFilename = downloadFile.getOriginalFilename();

            // Also save download file to challenge folder - USING FIXED VERSION
            String filesPath = fileStorageService.getChallengeBasePath(challengeId) + "/files";
            Path filesDir = Paths.get(filesPath);
            if (!Files.exists(filesDir)) {
                Files.createDirectories(filesDir);
            }

            Path downloadFilePath = filesDir.resolve(originalFilename);

            // Use InputStream instead of transferTo to avoid path issues
            try (InputStream inputStream = downloadFile.getInputStream()) {
                Files.copy(inputStream, downloadFilePath, StandardCopyOption.REPLACE_EXISTING);
            }
        }

        // Handle null flag - provide empty string if null
        String safeFlag = flag != null ? flag : "";

        // Create entity with potentially null file data
        ChallengeEntity entity = new ChallengeEntity(
                challengeId,
                title,
                description,
                category,
                difficulty,
                points,
                downloadBytes,
                safeFlag  // Use safe flag
        );

        // Set folder path
        entity.setChallengeFolderPath(challengeFolderPath);

        // Store file metadata as JSON
        if (!savedFiles.isEmpty()) {
            Map<String, String> filesMap = new HashMap<>();
            for (String fileName : savedFiles) {
                filesMap.put(fileName, getFileType(fileName));
            }
            entity.setDockerFilesJson(objectMapper.writeValueAsString(filesMap));
        }

        // Only set filename if provided
        if (originalFilename != null) {
            entity.setOriginalFilename(originalFilename);
        }

        // Set other optional fields

        
        // Detailed debug for requiresInstance
        System.out.println("=== DEBUG: ChallengeService requiresInstance processing ===");
        System.out.println("DEBUG: requiresInstance parameter received: " + requiresInstance);
        System.out.println("DEBUG: requiresInstance parameter type: " + (requiresInstance != null ? requiresInstance.getClass().getName() : "null"));
        
        boolean finalRequiresInstanceValue = requiresInstance != null ? requiresInstance : false;
        System.out.println("DEBUG: Final boolean value to set: " + finalRequiresInstanceValue);
        System.out.println("DEBUG: Final boolean value type: " + Boolean.class.getName());
        
        entity.setRequiresInstance(finalRequiresInstanceValue);
        
        // Verify what was actually set in the entity
        System.out.println("DEBUG: Entity requiresInstance after setting: " + entity.isRequiresInstance());
        System.out.println("=== END DEBUG ===");

        // Set hints
        if (hints != null && hints.length > 0) {
            entity.setHintsJson(objectMapper.writeValueAsString(hints));
        } else {
            entity.setHintsJson("[]");
        }

        try {
            // Debug: Before save
            System.out.println("=== DEBUG: Before database save ===");
            System.out.println("DEBUG: Entity ID: " + entity.getId());
            System.out.println("DEBUG: Entity requiresInstance before save: " + entity.isRequiresInstance());

            System.out.println("=== END DEBUG ===");
            
            ChallengeEntity savedEntity = repo.saveAndFlush(entity);
            
            // Debug: Check what was actually saved to database
            System.out.println("=== DEBUG: After database save ===");
            System.out.println("DEBUG: Saved entity ID: " + savedEntity.getId());
            System.out.println("DEBUG: Saved entity requiresInstance: " + savedEntity.isRequiresInstance());

            
            // Check if the saved entity is the same object
            System.out.println("DEBUG: Same object reference: " + (entity == savedEntity));
            System.out.println("DEBUG: Entity hashCode: " + entity.hashCode());
            System.out.println("DEBUG: Saved entity hashCode: " + savedEntity.hashCode());
            System.out.println("=== END DEBUG ===");
            
            System.out.println("Challenge created: " + challengeId);
            return toDto(savedEntity);
        } catch (Exception e) {
            System.err.println("Failed to save challenge: " + e.getMessage());
            e.printStackTrace();
            throw e; // Re-throw the exception
        }
    }

    /**
     * Update an existing challenge with file support
     */
    @Transactional
    public ChallengeDto updateChallenge(String id, String title, String description, String category,
                                     String difficulty, Integer points, String flag,
                                     MultipartFile downloadFile,
                                     Boolean requiresInstance,
                                     MultipartFile[] dockerFiles,
                                     String[] hints) throws IOException {

        ChallengeEntity existingEntity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + id));

        // Update basic fields
        if (title != null) existingEntity.setTitle(title);
        if (description != null) existingEntity.setDescription(description);
        if (category != null) existingEntity.setCategory(category);
        if (difficulty != null) existingEntity.setDifficulty(difficulty);
        if (points != null) existingEntity.setPoints(points);
        if (flag != null) existingEntity.setFlag(flag);
        if (requiresInstance != null) existingEntity.setRequiresInstance(requiresInstance);

        // Handle download file update
        if (downloadFile != null && !downloadFile.isEmpty()) {
            byte[] downloadBytes = downloadFile.getBytes();
            existingEntity.setDownload(downloadBytes);
            existingEntity.setOriginalFilename(downloadFile.getOriginalFilename());

            // Save to challenge folder
            String filesPath = existingEntity.getChallengeFolderPath() + "/files";
            Path filesDir = Paths.get(filesPath);
            if (!Files.exists(filesDir)) {
                Files.createDirectories(filesDir);
            }
            Path downloadFilePath = filesDir.resolve(downloadFile.getOriginalFilename());
            downloadFile.transferTo(downloadFilePath.toFile());
        }

        // Handle Docker files update
        if (dockerFiles != null && dockerFiles.length > 0) {
            List<String> savedFiles = fileStorageService.saveDockerFiles(id, dockerFiles);

            Map<String, String> filesMap = new HashMap<>();
            for (String fileName : savedFiles) {
                filesMap.put(fileName, getFileType(fileName));
            }
            existingEntity.setDockerFilesJson(objectMapper.writeValueAsString(filesMap));
        }

        // Handle hints update
        if (hints != null && hints.length > 0) {
            existingEntity.setHintsJson(objectMapper.writeValueAsString(hints));
        } else {
            existingEntity.setHintsJson("[]");
        }

        ChallengeEntity updatedEntity = repo.save(existingEntity);
        System.out.println("Challenge updated: " + id);
        return toDto(updatedEntity);
    }

    /**
     * Delete a challenge by ID (with file cleanup)
     */
    @Transactional
    public void deleteChallenge(String id) throws IOException {
        if (!repo.existsById(id)) {
            throw new RuntimeException("Challenge not found: " + id);
        }

        // Delete challenge folder and files
        ChallengeEntity entity = repo.findById(id).orElse(null);
        if (entity != null && entity.getChallengeFolderPath() != null) {
            fileStorageService.deleteChallengeFolder(id);
        }

        repo.deleteById(id);
        System.out.println("Challenge deleted: " + id);
    }

    /**
     * Get Docker files for a challenge
     */
    @Transactional(readOnly = true)
    public List<String> getChallengeDockerFiles(String challengeId) throws IOException {
        return fileStorageService.getDockerFiles(challengeId);
    }

    /**
     * Get a specific Docker file
     */
    @Transactional(readOnly = true)
    public byte[] getChallengeDockerFile(String challengeId, String fileName) throws IOException {
        Path filePath = Paths.get(fileStorageService.getChallengeBasePath(challengeId), "docker", fileName);
        return Files.readAllBytes(filePath);
    }

    /**
     * Check if challenge has Docker files
     */
    @Transactional(readOnly = true)
    public boolean hasDockerFiles(String challengeId) throws IOException {
        List<String> files = getChallengeDockerFiles(challengeId);
        return !files.isEmpty();
    }

    /**
     * Get admin statistics
     */
    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();

        // Total challenges
        long totalChallenges = repo.count();
        stats.put("totalChallenges", totalChallenges);

        // Count challenges with instances
        long instanceChallenges = repo.findAll().stream()
                .filter(ChallengeEntity::isRequiresInstance)
                .count();
        stats.put("instanceChallenges", instanceChallenges);

        // Total users - placeholder for now
        stats.put("totalUsers", "N/A");

        // Total submissions - placeholder for now
        stats.put("totalSubmissions", "N/A");

        // Active challenges (same as total for now)
        stats.put("activeChallenges", totalChallenges);

        // Challenges by category
        List<Object[]> categoryCounts = repo.countChallengesByCategory();
        List<Map<String, Object>> byCategory = categoryCounts.stream()
                .map(result -> Map.of(
                        "category", result[0],
                        "count", result[1]
                ))
                .collect(Collectors.toList());
        stats.put("challengesByCategory", byCategory);

        // Challenges by difficulty
        List<Object[]> difficultyCounts = repo.countChallengesByDifficulty();
        List<Map<String, Object>> byDifficulty = difficultyCounts.stream()
                .map(result -> Map.of(
                        "difficulty", result[0],
                        "count", result[1]
                ))
                .collect(Collectors.toList());
        stats.put("challengesByDifficulty", byDifficulty);

        return stats;
    }

    @Transactional(readOnly = true)
    public ChallengeDto getChallengeById(String id) {
        return repo.findById(id)
                .map(this::toDto)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + id));
    }

    @Transactional(readOnly = true)
    public String getOriginalFilename(String challengeId) {
        ChallengeEntity entity = repo.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));
        return entity.getOriginalFilename();
    }

    private ChallengeDto toDto(ChallengeEntity e) {
        if (e.getId() == null) {
            throw new IllegalStateException("Entity has no ID — cannot map to DTO");
        }

        String downloadUrl = null;
        if (e.getDownloadZip() != null && e.getDownloadZip().length > 0) {
            downloadUrl = "http://localhost:8080/api/challenges/" + e.getId() + "/download";
        }

        ChallengeDto challenge = new ChallengeDto(
                e.getId(),
                e.getTitle(),
                e.getDescription(),
                e.getCategory(),
                e.getDifficulty(),
                e.getPoints(),
                downloadUrl,
                e.getOriginalFilename()
        );

        challenge.setRequiresInstance(e.isRequiresInstance());
        challenge.setChallengeFolderPath(e.getChallengeFolderPath());
        challenge.setDockerFilesJson(e.getDockerFilesJson());

        if (e.getHintsJson() != null && !e.getHintsJson().isEmpty()) {
            try {
                String[] hints = objectMapper.readValue(e.getHintsJson(), String[].class);
                challenge.setHints(hints);
            } catch (IOException ex) {
                challenge.setHints(new String[0]);
            }
        } else {
            challenge.setHints(new String[0]);
        }

        return challenge;
    }

    /**
     * Determine file type based on extension
     */
    private String getFileType(String fileName) {
        if (fileName.endsWith(".dockerfile") || fileName.equals("Dockerfile")) {
            return "dockerfile";
        } else if (fileName.endsWith(".sh")) {
            return "script";
        } else if (fileName.endsWith(".c") || fileName.endsWith(".cpp")) {
            return "source";
        } else if (fileName.endsWith(".py")) {
            return "python";
        } else if (fileName.endsWith(".js")) {
            return "javascript";
        } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
            return "text";
        } else {
            return "binary";
        }
    }
}
