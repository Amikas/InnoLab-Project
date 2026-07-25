package at.fhtw.ctfbackend.services;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DockerService {

    private static final Logger logger = LoggerFactory.getLogger(DockerService.class);

    // Validation patterns for security
    private static final Pattern CONTAINER_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$");
    private static final Pattern IMAGE_NAME_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9._/-]{0,127}(:[a-zA-Z0-9._-]{0,127})?$");
    private static final Pattern CHALLENGE_ID_PATTERN = Pattern.compile("^[a-z0-9][a-z0-9_.-]{0,62}$");

    // Base path for challenges
    @Value("${challenges.base.path:./challenges}")
    private String challengesBasePath;

    // Add the ChallengeFileStorageService dependency
    private final ChallengeFileStorageService fileStorageService;

    public DockerService(ChallengeFileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    /**
     * Build a Docker image from a challenge directory
     */
    public String buildImage(String challengeId, String tag) {
        validateChallengeId(challengeId);
        validateImageTag(tag);

        // Determine challenge directory path and Dockerfile location
        String buildContextDir = getBuildContextDir(challengeId);
        String dockerfilePath = getDockerfilePath(challengeId);

        try {
            List<String> command = new ArrayList<>();
            command.add("docker");
            command.add("build");
            command.add("-t");
            command.add(tag);
            command.add("-f");
            command.add(dockerfilePath);
            command.add(buildContextDir);

            logger.debug("=== DOCKER BUILD DEBUG ===");
            logger.debug("Command: {}", String.join(" ", command));
            logger.debug("Build context: {}", buildContextDir);
            logger.debug("Dockerfile: {}", dockerfilePath);
            logger.debug("Image tag: {}", tag);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            logger.debug("Process started, PID: {}", process.pid());

            // Read output in a daemon thread so waitFor() is not blocked
            // by zombie subprocesses keeping the pipe open.
            StringBuffer output = new StringBuffer();
            Thread readerThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        logger.debug("   {}", line);
                        output.append(line).append("\n");
                    }
                    logger.debug("=== DOCKER BUILD DEBUG: readLine() returned null (EOF) ===");
                } catch (IOException e) {
                    // Expected: stream closed after waitFor to unblock reader
                    logger.debug("=== DOCKER BUILD DEBUG: readLine() threw IOException (stream closed) ===");
                }
            });
            readerThread.setDaemon(true);
            readerThread.start();

            logger.debug("=== DOCKER BUILD DEBUG: waiting for process (timeout=5min) ===");
            boolean completed = process.waitFor(5, TimeUnit.MINUTES);
            logger.debug("=== DOCKER BUILD DEBUG: waitFor() returned, completed={} ===", completed);

            if (!completed) {
                process.destroy(); // SIGTERM
                try {
                    Thread.sleep(3000);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
                if (process.isAlive()) {
                    process.destroyForcibly(); // SIGKILL if still alive
                }
                readerThread.interrupt();
                throw new RuntimeException("Docker build timed out after 5 minutes");
            }

            // Close the input stream to force the reader thread to unblock
            logger.debug("=== DOCKER BUILD DEBUG: closing input stream ===");
            process.getInputStream().close();

            // Give reader thread a moment to finish
            readerThread.join(1000);

            int exitCode = process.exitValue();
            logger.debug("=== DOCKER BUILD DEBUG: exitCode={} ===", exitCode);

            if (exitCode != 0) {
                throw new RuntimeException("Docker build failed with exit code " + exitCode
                        + "\n--- build output (stdout + stderr merged) ---\n" + output);
            }

            logger.info(" Image built successfully: {}", tag);
            return tag;

        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to build Docker image: " + e.getMessage(), e);
        }
    }

    /**
     * Build and run a challenge in one step with automatic file setup
     */
    public String buildAndRun(String challengeId,
            String containerName,
            String flag,
            int sshPort) {

        validateChallengeId(challengeId);

        // Ensure challenge has a valid Dockerfile
        String dockerfilePath = getDockerfilePath(challengeId);
        logger.debug("Dockerfile at: {}", dockerfilePath);

        if (!Files.exists(Paths.get(dockerfilePath))) {
            throw new RuntimeException("Dockerfile not found for challenge: " + challengeId
                    + " at path: " + dockerfilePath);
        }

        // Build image
        String imageTag = "ctf-" + challengeId.toLowerCase().replaceAll("[^a-z0-9-]", "");
        if (!imageExists(imageTag)) {
            logger.info(" Building image: {}", imageTag);
            buildImage(challengeId, imageTag);
        } else {
            logger.info(" Using cached image: {}", imageTag);
        }

        // Run container
        logger.info(" Running container: {}", containerName);
        runContainer(containerName, imageTag, flag, sshPort);

        return containerName;
    }

    /**
     * Get the correct build context directory (parent of docker folder).
     * Recreates the folder structure if it's missing (survives volume wipe).
     */
    private String getBuildContextDir(String challengeId) {
        Path challengeDir = ensureChallengeDirectory(challengeId);
        return challengeDir.toAbsolutePath().toString();
    }

    /**
     * Get the correct Dockerfile path.
     * Recreates the folder structure if it's missing (survives volume wipe).
     */
    private String getDockerfilePath(String challengeId) {
        Path challengeDir = ensureChallengeDirectory(challengeId);

        // Check multiple possible locations for Dockerfile
        List<Path> possiblePaths = Arrays.asList(
                challengeDir.resolve("docker/Dockerfile"), // Primary location
                challengeDir.resolve("docker/dockerfile"), // lowercase
                challengeDir.resolve("Dockerfile"), // Root (fallback)
                challengeDir.resolve("dockerfile") // lowercase in root (fallback)
        );

        for (Path dockerfilePath : possiblePaths) {
            if (Files.exists(dockerfilePath) && Files.isRegularFile(dockerfilePath)) {
                logger.info(" Found Dockerfile at: {}", dockerfilePath);
                return dockerfilePath.toAbsolutePath().toString();
            }
        }

        // No Dockerfile found — fail clearly instead of generating one
        throw new RuntimeException("No Dockerfile found for challenge: " + challengeId
                + ". Checked: docker/Dockerfile, docker/dockerfile, Dockerfile, dockerfile"
                + " at " + challengeDir);
    }

    /**
     * Ensure the challenge directory exists on disk.
     * If missing, recreates the full structure (docker/ + files/)
     * via ChallengeFileStorageService. This makes the system resilient
     * to Docker volume wipes between restarts.
     */
    private Path ensureChallengeDirectory(String challengeId) {
        String challengePath = challengesBasePath + "/" + challengeId;
        Path challengeDir = Paths.get(challengePath);

        if (!Files.exists(challengeDir)) {
            logger.warn("Challenge directory missing, recreating: {}", challengePath);
            try {
                fileStorageService.createChallengeFolder(challengeId);
            } catch (IOException e) {
                throw new RuntimeException("Failed to recreate challenge directory: " + challengePath, e);
            }
        }
        return challengeDir;
    }

    /**
     * Run a container with security constraints
     */
    public void runContainer(String containerName, String imageName, String flag,
            int sshPort) {

        logger.debug("Running container - Image: {}, Name: {}, SSH Port: {}", imageName, containerName, sshPort);


        // Check for existing container with same name (race condition with cleanup)
        if (containerExists(containerName)) {
            logger.warn("WARNING: Container {} already exists, removing before run", containerName);
            try {
                stopContainer(containerName);
            } catch (Exception e) {
                logger.warn("Graceful stop failed, killing: {}", containerName);
                killContainer(containerName);
            }
        }

        try {
            // Build command
            List<String> command = new ArrayList<>(Arrays.asList(
                    "docker", "run", "-d",
                    "--name", containerName,
                    "--network", "ctf-network",
                    "-e", "FLAG=" + flag,
                    "-p", sshPort + ":22"
            ));

            // Add memory limits and security constraints
            command.add("--memory=512m");
            command.add("--cpus=1.0");
            command.add("--tmpfs=/tmp:rw,noexec,nosuid,size=100m");

            command.add(imageName);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Read output in real-time
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logger.debug("   {}", line);
                    output.append(line).append("\n");
                }
            }

            // Wait for process to complete
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("Docker run failed with exit code " + exitCode + ":\n" + output);
            }

            // Wait a moment for container to fully initialize
            Thread.sleep(2000);

        } catch (Exception e) {
            logger.error("runContainer failed: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to run container: " + e.getMessage(), e);
        }
    }

    /**
     * Stop and remove a running container
     */
    public void stopContainer(String containerName) {
        validateContainerName(containerName);

        try {
            logger.info(" Stopping container: {}", containerName);

            // Stop container (timeout after 10 seconds)
            ProcessBuilder stopCmd = new ProcessBuilder("docker", "stop", "-t", "10", containerName);
            Process stopProc = stopCmd.start();
            stopProc.waitFor();

            // Remove container
            ProcessBuilder rmCmd = new ProcessBuilder("docker", "rm", "-f", containerName);
            Process rmProc = rmCmd.start();
            rmProc.waitFor();

            logger.info(" Container stopped and removed: {}", containerName);

        } catch (Exception e) {
            throw new RuntimeException("Failed to stop container: " + e.getMessage(), e);
        }
    }

    /**
     * Check if container exists
     */
    public boolean containerExists(String containerName) {
        validateContainerName(containerName);

        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "inspect", containerName);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Check if image exists locally (checks both exact name and with :latest tag)
     */
    public boolean imageExists(String imageName) {
        validateImageName(imageName);

        try {
            // Try exact name first
            ProcessBuilder pb = new ProcessBuilder("docker", "image", "inspect", imageName);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            if (p.waitFor() == 0) {
                return true;
            }

            // Try with :latest tag
            pb = new ProcessBuilder("docker", "image", "inspect", imageName + ":latest");
            pb.redirectErrorStream(true);
            p = pb.start();
            return p.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Remove Docker image
     */
    public void removeImage(String imageName) {
        validateImageName(imageName);

        try {
            logger.info(" Removing image: {}", imageName);
            ProcessBuilder pb = new ProcessBuilder("docker", "rmi", "-f", imageName);
            Process p = pb.start();
            p.waitFor();
            logger.info(" Image removed: {}", imageName);
        } catch (Exception e) {
            logger.error("Failed to remove image {}: {}", imageName, e.getMessage());
        }
    }

    /**
     * Kill a container forcefully (for emergency cleanup)
     */
    public void killContainer(String containerName) {
        validateContainerName(containerName);

        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "kill", containerName);
            Process p = pb.start();
            p.waitFor();
            logger.info(" Container killed: {}", containerName);
        } catch (Exception e) {
            logger.error("Failed to kill container {}: {}", containerName, e.getMessage());
        }
    }

    /**
     * Get container status
     */
    public String getContainerStatus(String containerName) {
        validateContainerName(containerName);

        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "inspect",
                    "--format", "{{.State.Status}}", containerName);
            pb.redirectErrorStream(true);
            Process p = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String status = reader.readLine();
            p.waitFor();

            return status != null ? status : "unknown";
        } catch (Exception e) {
            return "error";
        }
    }

    /**
     * List all running containers for a specific challenge
     */
    public List<String> getRunningContainersForChallenge(String challengeId) {
        validateChallengeId(challengeId);

        List<String> containers = new ArrayList<>();
        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "ps",
                    "--filter", "name=ctf-" + challengeId,
                    "--format", "{{.Names}}");
            pb.redirectErrorStream(true);
            Process p = pb.start();

            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    containers.add(line.trim());
                }
            }
            p.waitFor();

            return containers;
        } catch (Exception e) {
            logger.error("Failed to list containers: {}", e.getMessage());
            return containers;
        }
    }

    /**
     * Clean up all containers for a specific challenge
     */
    public void cleanupChallengeContainers(String challengeId) {
        validateChallengeId(challengeId);

        List<String> containers = getRunningContainersForChallenge(challengeId);
        for (String container : containers) {
            try {
                stopContainer(container);
            } catch (Exception e) {
                logger.error("Failed to stop container {}: {}", container, e.getMessage());
            }
        }
    }

    // ===== VALIDATION METHODS =====
    private void validateContainerName(String name) {
        if (name == null || name.isEmpty()) {
            throw new IllegalArgumentException("Container name cannot be empty");
        }
        if (name.length() > 63) {
            throw new IllegalArgumentException("Container name too long (max 63 chars)");
        }
        if (!CONTAINER_NAME_PATTERN.matcher(name).matches()) {
            throw new IllegalArgumentException("Invalid container name: " + name);
        }
    }

    private void validateImageName(String image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Image name cannot be empty");
        }
        if (!IMAGE_NAME_PATTERN.matcher(image).matches()) {
            throw new IllegalArgumentException("Invalid image name: " + image);
        }
    }

    private void validateImageTag(String tag) {
        if (tag == null || tag.isEmpty()) {
            throw new IllegalArgumentException("Image tag cannot be empty");
        }
        if (tag.contains("..") || tag.contains("/") || tag.matches(".*[^a-z0-9_.-].*")) {
            throw new IllegalArgumentException("Invalid image tag: " + tag);
        }
    }

    private void validateChallengeId(String challengeId) {
        if (challengeId == null || challengeId.isEmpty()) {
            throw new IllegalArgumentException("Challenge ID cannot be empty");
        }
        if (!CHALLENGE_ID_PATTERN.matcher(challengeId).matches()) {
            throw new IllegalArgumentException("Invalid challenge ID: " + challengeId);
        }
    }

}
