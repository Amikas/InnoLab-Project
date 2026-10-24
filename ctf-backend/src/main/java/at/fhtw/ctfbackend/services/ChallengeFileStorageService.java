package at.fhtw.ctfbackend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class ChallengeFileStorageService {

    @Value("${challenges.base.path:./challenges}")
    private String challengesBasePath;

    /**
     * Create a challenge folder structure
     */
    public String createChallengeFolder(String challengeId) throws IOException {
        String challengePath = getAbsolutePath(challengesBasePath + "/" + challengeId);
        Path folderPath = Paths.get(challengePath);

        if (!Files.exists(folderPath)) {
            Files.createDirectories(folderPath);
        }

        // Create subdirectories
        Files.createDirectories(folderPath.resolve("docker"));
        Files.createDirectories(folderPath.resolve("files"));

        return challengePath;
    }

    /**
     * Save Docker files to challenge folder
     */
    public List<String> saveDockerFiles(String challengeId, MultipartFile[] files) throws IOException {
        List<String> savedFiles = new ArrayList<>();
        String dockerPath = getDockerPath(challengeId);
        Path dockerFolder = Paths.get(dockerPath);

        if (!Files.exists(dockerFolder)) {
            Files.createDirectories(dockerFolder);
        }

        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                String fileName = sanitizeFileName(file.getOriginalFilename());
                Path filePath = dockerFolder.resolve(fileName);

                // Create parent directories if they don't exist
                Path parentDir = filePath.getParent();
                if (parentDir != null && !Files.exists(parentDir)) {
                    Files.createDirectories(parentDir);
                }

                // Save file to disk - use InputStream to avoid path issues
                try (InputStream inputStream = file.getInputStream()) {
                    Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
                }

                savedFiles.add(fileName);
            }
        }

        return savedFiles;
    }

    /**
     * Store the challenge download under the canonical name files/&lt;id&gt;.&lt;extension&gt;.
     * Any previous canonical copy is replaced; unrelated files are left alone.
     */
    public void saveDownloadFile(String challengeId, String extension, byte[] data) throws IOException {
        if (data == null || data.length == 0 || extension == null) {
            return;
        }
        Path filesDir = Paths.get(getChallengeBasePath(challengeId), "files");
        Files.createDirectories(filesDir);

        Pattern canonical = Pattern.compile(Pattern.quote(challengeId) + "\\.[A-Za-z0-9]{1,16}");
        List<Path> stale;
        try (var stream = Files.list(filesDir)) {
            stale = stream
                    .filter(Files::isRegularFile)
                    .filter(path -> canonical.matcher(path.getFileName().toString()).matches())
                    .toList();
        }
        for (Path path : stale) {
            Files.deleteIfExists(path);
        }

        Files.write(filesDir.resolve(challengeId + "." + extension), data,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    /**
     * Get all Docker files for a challenge
     */
    public List<String> getDockerFiles(String challengeId) throws IOException {
        String dockerPath = getDockerPath(challengeId);
        Path dockerFolder = Paths.get(dockerPath);

        if (!Files.exists(dockerFolder)) {
            return new ArrayList<>();
        }

        try (var stream = Files.list(dockerFolder)) {
            return stream
                    .filter(Files::isRegularFile)
                    .map(path -> path.getFileName().toString())
                    .toList();
        }
    }

    /**
     * Get a specific Docker file
     */
    public File getDockerFile(String challengeId, String fileName) {
        String filePath = getDockerPath(challengeId) + "/" + fileName;
        return new File(filePath);
    }

    /**
     * Delete a challenge folder and all its contents
     */
    public void deleteChallengeFolder(String challengeId) throws IOException {
        String challengePath = getChallengePath(challengeId);
        Path folderPath = Paths.get(challengePath);

        if (Files.exists(folderPath)) {
            deleteDirectoryRecursively(folderPath);
        }
    }

    /**
     * Check if challenge folder exists
     */
    public boolean challengeFolderExists(String challengeId) {
        String challengePath = getChallengePath(challengeId);
        return Files.exists(Paths.get(challengePath));
    }

    /**
     * Get the base path for a challenge
     */
    public String getChallengeBasePath(String challengeId) {
        return getAbsolutePath(challengesBasePath + "/" + challengeId);
    }

    /**
     * Get Docker folder path for a challenge
     */
    private String getDockerPath(String challengeId) {
        return getChallengeBasePath(challengeId) + "/docker";
    }

    /**
     * Get challenge folder path
     */
    private String getChallengePath(String challengeId) {
        return getChallengeBasePath(challengeId);
    }

    /**
     * Convert relative path to absolute path
     */
    private String getAbsolutePath(String relativePath) {
        if (Paths.get(relativePath).isAbsolute()) {
            return relativePath;
        }
        // Get the project root directory
        String projectRoot = System.getProperty("user.dir");
        return Paths.get(projectRoot, relativePath).toString();
    }

    /**
     * Sanitize filename to prevent path traversal
     */
    private String sanitizeFileName(String fileName) {
        if (fileName == null) return "file";

        // Remove path traversal attempts
        fileName = fileName.replaceAll("\\.\\.", "");
        fileName = fileName.replaceAll("/", "_");
        fileName = fileName.replaceAll("\\\\", "_");

        return fileName;
    }

    /**
     * Recursively delete a directory
     */
    private void deleteDirectoryRecursively(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (var stream = Files.list(path)) {
                stream.forEach(p -> {
                    try {
                        deleteDirectoryRecursively(p);
                    } catch (IOException e) {
                        throw new RuntimeException("Failed to delete: " + p, e);
                    }
                });
            }
        }
        Files.delete(path);
    }
}