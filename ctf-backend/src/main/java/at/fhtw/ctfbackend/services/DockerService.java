package at.fhtw.ctfbackend.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.regex.Pattern;
import java.util.concurrent.TimeUnit;

@Service
public class DockerService {

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

        // Remove existing image to prevent accumulation
        if (imageExists(tag)) {
            System.out.println("Removing existing image before rebuild: " + tag);
            removeImage(tag);
        }

        // Determine challenge directory path and Dockerfile location
        String buildContextDir = getBuildContextDir(challengeId);
        String dockerfilePath = getDockerfilePath(challengeId);

        try {
            List<String> command = new ArrayList<>();
            command.add("docker");
            command.add("build");
            command.add("--no-cache"); // Ensure fresh build
            command.add("-t");
            command.add(tag);
            command.add("-f");
            command.add(dockerfilePath);
            command.add(buildContextDir);

            System.out.println(" === BUILDING DOCKER IMAGE ===");
            System.out.println(" Build context: " + buildContextDir);
            System.out.println(" Dockerfile: " + dockerfilePath);
            System.out.println(" Tag: " + tag);
            System.out.println(" Command: " + String.join(" ", command));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            pb.redirectError(ProcessBuilder.Redirect.PIPE);
            Process process = pb.start();

            // Read and log output in real-time
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("   " + line);
                    output.append(line).append("\n");
                }
            }

            boolean completed = process.waitFor(5, TimeUnit.MINUTES);

            if (!completed) {
                process.destroy();
                throw new RuntimeException("Docker build timed out after 5 minutes");
            }

            // Also capture stderr
            StringBuilder stderr = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.err.println("   [stderr] " + line);
                    stderr.append(line).append("\n");
                }
            }

            int exitCode = process.exitValue();

            if (exitCode != 0) {
                throw new RuntimeException("Docker build failed with exit code " + exitCode + ":\nSTDOUT:\n" + output + "\nSTDERR:\n" + stderr);
            }

            System.out.println(" Image built successfully: " + tag);
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
        System.out.println(" Checking Dockerfile at: " + dockerfilePath);

        if (!Files.exists(Paths.get(dockerfilePath))) {
            throw new RuntimeException("Dockerfile not found for challenge: " + challengeId +
                    " at path: " + dockerfilePath);
        }

        // Build image
        String imageTag = "ctf-" + challengeId.toLowerCase().replaceAll("[^a-z0-9-]", "");
        System.out.println(" Building image: " + imageTag);
        buildImage(challengeId, imageTag);

        // Run container
        System.out.println(" Running container: " + containerName);
        runContainer(containerName, imageTag, flag, sshPort);

        return containerName;
    }

    /**
     * Get the correct build context directory (parent of docker folder)
     */
    private String getBuildContextDir(String challengeId) {
        String challengePath = challengesBasePath + "/" + challengeId;
        Path challengeDir = Paths.get(challengePath);

        if (!Files.exists(challengeDir)) {
            throw new IllegalArgumentException("Challenge directory not found: " + challengePath);
        }

        // Build context should be the challenge directory itself (parent of docker folder)
        return challengeDir.toAbsolutePath().toString();
    }

    /**
     * Get the correct Dockerfile path
     */
    private String getDockerfilePath(String challengeId) {
        String challengePath = challengesBasePath + "/" + challengeId;
        Path challengeDir = Paths.get(challengePath);

        if (!Files.exists(challengeDir)) {
            throw new IllegalArgumentException("Challenge directory not found: " + challengePath);
        }

        // Check multiple possible locations for Dockerfile
        List<Path> possiblePaths = Arrays.asList(
                challengeDir.resolve("docker/Dockerfile"),     // Primary location
                challengeDir.resolve("docker/dockerfile"),     // lowercase
                challengeDir.resolve("Dockerfile"),            // Root (fallback)
                challengeDir.resolve("dockerfile")             // lowercase in root (fallback)
        );

        for (Path dockerfilePath : possiblePaths) {
            if (Files.exists(dockerfilePath) && Files.isRegularFile(dockerfilePath)) {
                System.out.println(" Found Dockerfile at: " + dockerfilePath);
                return dockerfilePath.toAbsolutePath().toString();
            }
        }

        // If no Dockerfile found, create a minimal one in docker/ folder
        return createMinimalDockerfile(challengeId);
    }

    /**
     * Create a minimal Dockerfile if none exists
     */
    private String createMinimalDockerfile(String challengeId) throws RuntimeException {
        try {
            String challengePath = challengesBasePath + "/" + challengeId;
            Path dockerDir = Paths.get(challengePath, "docker");
            Files.createDirectories(dockerDir);

            Path dockerfilePath = dockerDir.resolve("Dockerfile");

            String minimalDockerfile = """
                FROM alpine:latest
                
                RUN apk update && apk add --no-cache \\
                    bash \\
                    openssh-server \\
                    sudo
                
                # Create ctfuser
                RUN adduser -D ctfuser && \\
                    echo "ctfuser:ctfuser" | chpasswd && \\
                    echo "ctfuser ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
                
                # Setup SSH
                RUN mkdir -p /run/openrc && \\
                    touch /run/openrc/softlevel && \\
                    ssh-keygen -A
                
                # Create challenge directory
                RUN mkdir -p /challenge && chown -R ctfuser:ctfuser /challenge
                
                # Copy files if they exist
                COPY . /challenge/
                
                WORKDIR /home/ctfuser
                USER ctfuser
                
                # Start SSH
                CMD ["/usr/sbin/sshd", "-D"]
                """;

            Files.writeString(dockerfilePath, minimalDockerfile);
            System.out.println(" Created minimal Dockerfile at: " + dockerfilePath);

            return dockerfilePath.toAbsolutePath().toString();

        } catch (IOException e) {
            throw new RuntimeException("Failed to create Dockerfile for challenge: " + challengeId, e);
        }
    }

    /**
     * Run a container with security constraints
     */
    public void runContainer(String containerName, String imageName, String flag,
                             int sshPort) {

        System.out.println(" === RUN CONTAINER ===");
        System.out.println(" Image: " + imageName);
        System.out.println(" Container: " + containerName);
        System.out.println(" Ports: SSH=" + sshPort);
        System.out.println(" Flag: " + (flag != null ? flag.substring(0, Math.min(flag.length(), 20)) : "null"));

        // Check for existing container with same name (race condition with cleanup)
        if (containerExists(containerName)) {
            System.err.println("WARNING: Container " + containerName + " already exists, removing before run");
            try {
                stopContainer(containerName);
            } catch (Exception e) {
                System.err.println("Graceful stop failed, killing: " + containerName);
                killContainer(containerName);
            }
        }

        try {
            // Build command
            List<String> command = new ArrayList<>(Arrays.asList(
                    "docker", "run", "-d",
                    "--name", containerName,
                    "--network", "ctf-isolated",
                    "-e", "FLAG=" + flag,
                    "-p", sshPort + ":22"
            ));



            // Add memory limits and security constraints
            command.add("--memory=512m");
            command.add("--cpus=1.0");
            command.add("--tmpfs=/tmp:rw,noexec,nosuid,size=100m");

            command.add(imageName);

            System.out.println(" Command: " + String.join(" ", command));

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Read output in real-time
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                System.out.println(" Docker output:");
                while ((line = reader.readLine()) != null) {
                    System.out.println("   " + line);
                    output.append(line).append("\n");
                }
            }

            // Wait for process to complete
            int exitCode = process.waitFor();
            System.out.println(" Exit code: " + exitCode);

            if (exitCode != 0) {
                throw new RuntimeException("Docker run failed with exit code " + exitCode + ":\n" + output);
            }

            System.out.println(" Container started successfully!");

            // Wait a moment for container to fully initialize
            Thread.sleep(2000);

            // Check if container is actually running
            String status = getContainerStatus(containerName);
            System.out.println(" Container status: " + status);

        } catch (Exception e) {
            System.out.println(" ERROR in runContainer: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to run container: " + e.getMessage(), e);
        }
    }

    /**
     * Stop and remove a running container
     */
    public void stopContainer(String containerName) {
        validateContainerName(containerName);

        try {
            System.out.println(" Stopping container: " + containerName);

            // Stop container (timeout after 10 seconds)
            ProcessBuilder stopCmd = new ProcessBuilder("docker", "stop", "-t", "10", containerName);
            Process stopProc = stopCmd.start();
            stopProc.waitFor();

            // Remove container
            ProcessBuilder rmCmd = new ProcessBuilder("docker", "rm", "-f", containerName);
            Process rmProc = rmCmd.start();
            rmProc.waitFor();

            System.out.println(" Container stopped and removed: " + containerName);

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
     * Check if image exists locally
     */
    public boolean imageExists(String imageName) {
        validateImageName(imageName);

        try {
            ProcessBuilder pb = new ProcessBuilder("docker", "image", "inspect", imageName);
            pb.redirectErrorStream(true);
            Process p = pb.start();
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
            System.out.println(" Removing image: " + imageName);
            ProcessBuilder pb = new ProcessBuilder("docker", "rmi", "-f", imageName);
            Process p = pb.start();
            p.waitFor();
            System.out.println(" Image removed: " + imageName);
        } catch (Exception e) {
            System.err.println("Failed to remove image " + imageName + ": " + e.getMessage());
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
            System.out.println(" Container killed: " + containerName);
        } catch (Exception e) {
            System.err.println("Failed to kill container " + containerName + ": " + e.getMessage());
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
            System.err.println("Failed to list containers: " + e.getMessage());
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
                System.err.println("Failed to stop container " + container + ": " + e.getMessage());
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

    private void validatePort(int port) {
        if (port < 1024 || port > 65535) {
            throw new IllegalArgumentException("Port must be between 1024 and 65535: " + port);
        }
    }

}