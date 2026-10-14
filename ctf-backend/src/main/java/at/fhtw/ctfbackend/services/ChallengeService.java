package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.controller.ChallengeNotFoundException;
import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.dto.ChallengeDto;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.HintRevealRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(ChallengeService.class);

    private final ChallengeRepository repo;
    private final ChallengeFileStorageService fileStorageService;
    private final SolveRepository solveRepository;
    private final HintRevealRepository hintRevealRepository;
    private final EnvironmentService environmentService;
    private final ObjectMapper objectMapper;

    public ChallengeService(ChallengeRepository repo,
                            ChallengeFileStorageService fileStorageService,
                            SolveRepository solveRepository,
                            HintRevealRepository hintRevealRepository,
                            EnvironmentService environmentService) {
        this.repo = repo;
        this.fileStorageService = fileStorageService;
        this.solveRepository = solveRepository;
        this.hintRevealRepository = hintRevealRepository;
        this.environmentService = environmentService;
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
        return createChallenge(title, null, description, null, category, difficulty, points, flag,
                downloadFile, requiresInstance, dockerFiles, hints, null);
    }

    @Transactional
    public ChallengeDto createChallenge(String title, String titleDe, String description, String descriptionDe,
                                     String category,
                                     String difficulty, Integer points, String flag,
                                     MultipartFile downloadFile,
                                     Boolean requiresInstance,
                                     MultipartFile[] dockerFiles,
                                     String[] hints, String[] hintsDe) throws IOException {

        String challengeId = title.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "") + "-" + System.currentTimeMillis();

        // Create challenge folder
        String challengeFolderPath = fileStorageService.createChallengeFolder(challengeId);
        logger.info("Created challenge folder: {}", challengeFolderPath);

        // Save Docker files if provided
        List<String> savedFiles = new ArrayList<>();
        if (dockerFiles != null && dockerFiles.length > 0) {
            savedFiles = fileStorageService.saveDockerFiles(challengeId, dockerFiles);
            logger.info("Saved {} Docker files for challenge: {}", savedFiles.size(), challengeId);
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
        ChallengeEntity entity = ChallengeEntity.builder()
                .id(challengeId)
                .title(title)
                .titleDe(titleDe)
                .description(description)
                .descriptionDe(descriptionDe)
                .category(category)
                .difficulty(difficulty)
                .points(points)
                .downloadZip(downloadBytes)
                .flag(safeFlag)
                .build();

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


        boolean finalRequiresInstanceValue = requiresInstance != null ? requiresInstance : false;
        entity.setRequiresInstance(finalRequiresInstanceValue);

        // Set hints
        if (hints != null && hints.length > 0) {
            entity.setHintsJson(objectMapper.writeValueAsString(hints));
        } else {
            entity.setHintsJson("[]");
        }
        if (hintsDe != null && hintsDe.length > 0) {
            entity.setHintsJsonDe(objectMapper.writeValueAsString(hintsDe));
        }

        try {
            ChallengeEntity savedEntity = repo.saveAndFlush(entity);

            logger.info("Challenge created: {}", challengeId);
            return toDto(savedEntity);
        } catch (Exception e) {
            logger.error("Failed to save challenge: {}", e.getMessage(), e);
            throw e;
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
        return updateChallenge(id, title, null, description, null, category, difficulty, points, flag,
                downloadFile, requiresInstance, dockerFiles, hints, null);
    }

    @Transactional
    public ChallengeDto updateChallenge(String id, String title, String titleDe, String description, String descriptionDe,
                                     String category,
                                     String difficulty, Integer points, String flag,
                                     MultipartFile downloadFile,
                                     Boolean requiresInstance,
                                     MultipartFile[] dockerFiles,
                                     String[] hints, String[] hintsDe) throws IOException {

        ChallengeEntity existingEntity = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + id));

        // Update basic fields
        if (title != null) existingEntity.setTitle(title);
        if (titleDe != null) existingEntity.setTitleDe(titleDe);
        if (description != null) existingEntity.setDescription(description);
        if (descriptionDe != null) existingEntity.setDescriptionDe(descriptionDe);
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
        } else if (hints != null) {
            existingEntity.setHintsJson("[]");
        }
        if (hintsDe != null && hintsDe.length > 0) {
            existingEntity.setHintsJsonDe(objectMapper.writeValueAsString(hintsDe));
        }

        ChallengeEntity updatedEntity = repo.save(existingEntity);
        logger.info("Challenge updated: {}", id);
        return toDto(updatedEntity);
    }

    /**
     * Delete a challenge by ID. Solve history is preserved (the challenge id
     * is stored as a plain string and the title is snapshotted onto the rows);
     * hint reveals and environment instances are removed with the challenge.
     */
    @Transactional
    public void deleteChallenge(String id) {
        ChallengeEntity entity = repo.findById(id)
                .orElseThrow(() -> new ChallengeNotFoundException(id));

        // Keep historical solve rows readable after the challenge row is gone.
        solveRepository.snapshotChallengeTitle(id, entity.getTitle());

        hintRevealRepository.deleteByChallengeId(id);
        environmentService.releaseInstancesForChallenge(id);
        repo.delete(entity);

        // Filesystem cleanup is not transactional. Run it last and swallow
        // failures so a permissions error cannot roll back the DB delete and
        // leave a live row with a deleted folder.
        try {
            fileStorageService.deleteChallengeFolder(id);
        } catch (Exception e) {
            logger.error("Challenge {} deleted, but folder cleanup failed: {}", id, e.getMessage(), e);
        }

        logger.info("Challenge deleted: {}", id);
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
                .orElseThrow(() -> new ChallengeNotFoundException(id));
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
        challenge.setTitleDe(e.getTitleDe());
        challenge.setDescriptionDe(e.getDescriptionDe());

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
        if (e.getHintsJsonDe() != null && !e.getHintsJsonDe().isEmpty()) {
            try {
                challenge.setHintsDe(objectMapper.readValue(e.getHintsJsonDe(), String[].class));
            } catch (IOException ex) {
                challenge.setHintsDe(new String[0]);
            }
        } else {
            challenge.setHintsDe(new String[0]);
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
