package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.repository.ChallengeInstanceRepository;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EnvironmentService {

    private final DockerService dockerService;
    private final ChallengeInstanceRepository instanceRepo;
    private final ChallengeRepository challengeRepo;

    // Thread-safe port allocation tracking
    private final Set<Integer> allocatedPorts = ConcurrentHashMap.newKeySet();
    private static final int SSH_BASE = 30000;
    private static final int PORT_RANGE = 1000;

    public EnvironmentService(
            ChallengeInstanceRepository instanceRepo,
            DockerService dockerService,
            ChallengeRepository challengeRepo) {

        this.instanceRepo = instanceRepo;
        this.dockerService = dockerService;
        this.challengeRepo = challengeRepo;

        // Initialize with existing allocated ports
        loadAllocatedPorts();
    }

    public ChallengeInstanceEntity startEnvironment(String username, String challengeId) {

        // 1. Check if already has running instance
        var existing = instanceRepo.findByUsernameAndChallengeIdAndStatus(
                username, challengeId, "RUNNING"
        );
        if (!existing.isEmpty()) return existing.get(0);

        // 2. Load challenge metadata
        ChallengeEntity challenge = challengeRepo.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));

        // 3. Generate dynamic flag
        String realFlag = generateFlag(challengeId);
        String flagHash = sha256(realFlag);

        // 4. Allocate available SSH port (with retry logic)
        int maxRetries = 3;
        int sshPort = 0;

        for (int attempt = 0; attempt < maxRetries; attempt++) {
            try {
                sshPort = allocatePort(SSH_BASE);
                break; // Success
            } catch (RuntimeException e) {
                if (attempt == maxRetries - 1) {
                    // Release any partially allocated ports
                    if (sshPort != 0) releasePort(sshPort);
                    throw new RuntimeException("Failed to allocate SSH port after " + maxRetries + " attempts", e);
                }
                // Wait before retry
                try { Thread.sleep(100); } catch (InterruptedException ignored) {}
            }
        }

        // 5. Create instance entry
        String instanceId = UUID.randomUUID().toString();
        String containerName = "ctf-" + instanceId.substring(0, 8); // Shorter container names

        ChallengeInstanceEntity inst = new ChallengeInstanceEntity();
        inst.setInstanceId(instanceId);
        inst.setUsername(username);
        inst.setChallengeId(challengeId);
        inst.setContainerName(containerName);
        inst.setFlagHash(flagHash);
        inst.setCreatedAt(Instant.now());
        inst.setExpiresAt(Instant.now().plusSeconds(3600)); // 1 hour
        inst.setStatus("RUNNING");
        inst.setSshPort(sshPort);

        try {
            instanceRepo.save(inst);

            // 6. Generate image name from challenge ID and start Docker container with real FLAG
            String imageName = "ctf-" + challengeId.toLowerCase().replaceAll("[^a-z0-9-]", "");
            dockerService.runContainer(
                    containerName,
                    imageName,
                    realFlag,
                    sshPort
            );

            return inst;

        } catch (Exception e) {
            try {
                instanceRepo.delete(inst);
            } catch (Exception dbEx) {
                System.err.println("CRITICAL: Failed to rollback DB record for instance: " + instanceId + " - " + dbEx.getMessage());
            }
            releasePort(sshPort);
            throw new RuntimeException("Failed to start container", e);
        }
    }

    public ChallengeInstanceEntity getInstance(String instanceId) {
        return instanceRepo.findByInstanceId(instanceId).orElse(null);
    }

    public record StopResult(boolean instanceFound, boolean dockerStopped, 
                             boolean portReleased, String errorMessage) {}

    public StopResult stopEnvironment(String instanceId) {
        var instOpt = instanceRepo.findByInstanceId(instanceId);
        if (instOpt.isEmpty()) {
            return new StopResult(false, false, false, "Instance not found: " + instanceId);
        }

        var inst = instOpt.get();
        boolean dockerStopped = false;
        boolean portReleased = false;

        try {
            dockerService.stopContainer(inst.getContainerName());
            dockerStopped = true;
        } catch (Exception e) {
            System.err.println("ERROR stopEnvironment: Failed to stop container " + inst.getContainerName() + ": " + e.getMessage());

            try {
                dockerService.killContainer(inst.getContainerName());
                dockerStopped = true;
            } catch (Exception e2) {
                System.err.println("ERROR stopEnvironment: Container kill also failed for " + inst.getContainerName() + ": " + e2.getMessage());
                if (!dockerService.containerExists(inst.getContainerName())) {
                    dockerStopped = true;
                    System.out.println("stopEnvironment: Container already gone, continuing with cleanup");
                }
            }
        }

        try {
            releasePort(inst.getSshPort());
            portReleased = true;
        } catch (Exception e) {
            System.err.println("ERROR stopEnvironment: Failed to release port " + inst.getSshPort() + ": " + e.getMessage());
        }

        inst.setStatus("STOPPED");
        instanceRepo.save(inst);

        String errorMsg = null;
        if (!dockerStopped) {
            errorMsg = "Container cleanup incomplete for " + inst.getContainerName();
            System.err.println("ERROR: " + errorMsg);
        }
        if (!portReleased) {
            String portMsg = "Port " + inst.getSshPort() + " NOT released for instance " + instanceId;
            System.err.println("ERROR: " + portMsg);
            errorMsg = (errorMsg != null ? errorMsg + "; " : "") + portMsg;
        }

        return new StopResult(true, dockerStopped, portReleased, errorMsg);
    }
    // In EnvironmentService.java, add this method: 

    public ChallengeInstanceEntity buildAndStartChallenge(String username, String challengeId) {
        // Check for existing instance
        var existing = instanceRepo.findByUsernameAndChallengeIdAndStatus(
                username, challengeId, "RUNNING"
        );
        if (!existing.isEmpty()) return existing.get(0);

        // Load challenge metadata
        ChallengeEntity challenge = challengeRepo.findById(challengeId)
                .orElseThrow(() -> new RuntimeException("Challenge not found: " + challengeId));

        // Generate dynamic flag
        String realFlag = generateFlag(challengeId);
        String flagHash = sha256(realFlag);

        // Allocate SSH port
        int sshPort = allocatePort(SSH_BASE);

        // Create instance entry
        String instanceId = UUID.randomUUID().toString();
        String containerName = "ctf-" + instanceId.substring(0, 8);

        ChallengeInstanceEntity inst = new ChallengeInstanceEntity();
        inst.setInstanceId(instanceId);
        inst.setUsername(username);
        inst.setChallengeId(challengeId);
        inst.setContainerName(containerName);
        inst.setFlagHash(flagHash);
        inst.setCreatedAt(Instant.now());
        inst.setExpiresAt(Instant.now().plusSeconds(3600));
        inst.setStatus("RUNNING");
        inst.setSshPort(sshPort);

        try {
            instanceRepo.save(inst);

            // Build and run the challenge
            dockerService.buildAndRun(
                    challengeId,
                    containerName,
                    realFlag,
                    sshPort
            );

            return inst;

        } catch (Exception e) {
            try {
                instanceRepo.delete(inst);
            } catch (Exception dbEx) {
                System.err.println("CRITICAL: Failed to rollback DB record for instance: " + instanceId + " - " + dbEx.getMessage());
            }
            releasePort(sshPort);
            throw new RuntimeException("Failed to build and start challenge", e);
        }
    }

    // ===== PORT MANAGEMENT =====
    private synchronized int allocatePort(int basePort) {
        // Try multiple attempts with random offsets
        List<Integer> triedPorts = new ArrayList<>();
        Random random = new Random();

        for (int attempt = 0; attempt < 50; attempt++) { // Try up to 50 ports
            // Add some randomness to avoid predictable port allocation
            int offset = random.nextInt(PORT_RANGE);
            int port = basePort + offset;

            // Skip if already tried
            if (triedPorts.contains(port)) {
                continue;
            }

            // Skip if already allocated in our tracking
            if (allocatedPorts.contains(port)) {
                triedPorts.add(port);
                continue;
            }

            // Verify port is actually available
            if (isPortAvailable(port)) {
                allocatedPorts.add(port);
                return port;
            }

            triedPorts.add(port);
        }

        // If we can't find a port in the randomized range, try sequentially
        for (int offset = 0; offset < PORT_RANGE; offset++) {
            int port = basePort + offset;

            if (!allocatedPorts.contains(port) && isPortAvailable(port)) {
                allocatedPorts.add(port);
                return port;
            }
        }

        throw new RuntimeException("No available ports in range " + basePort + "-" + (basePort + PORT_RANGE));
    }

    /**
     * Release port back to available pool
     */
    public synchronized void releasePort(int port) {
        allocatedPorts.remove(port);
    }

    /**
     * Atomically stop container and release associated resources.
     * Called by EnvironmentCleanupService to ensure ports are released after expiry.
     */
    public void cleanupAndReleasePort(String instanceId) {
        var instOpt = instanceRepo.findByInstanceId(instanceId);
        if (instOpt.isEmpty()) {
            System.err.println("cleanupAndReleasePort: Instance not found: " + instanceId);
            return;
        }

        var inst = instOpt.get();
        if (!"RUNNING".equals(inst.getStatus())) {
            System.out.println("cleanupAndReleasePort: Instance not running: " + instanceId + " status=" + inst.getStatus());
            return;
        }

        boolean dockerStopped = false;
        boolean portReleased = false;

        try {
            dockerService.stopContainer(inst.getContainerName());
            dockerStopped = true;
        } catch (Exception e) {
            System.err.println("cleanupAndReleasePort: Failed to stop container " + inst.getContainerName() + ": " + e.getMessage());
            try {
                dockerService.killContainer(inst.getContainerName());
                dockerStopped = true;
            } catch (Exception killEx) {
                System.err.println("cleanupAndReleasePort: Failed to kill container " + inst.getContainerName() + ": " + killEx.getMessage());
            }
        }

        try {
            releasePort(inst.getSshPort());
            portReleased = true;
        } catch (Exception e) {
            System.err.println("cleanupAndReleasePort: Failed to release port " + inst.getSshPort() + ": " + e.getMessage());
        }

        inst.setStatus("EXPIRED");
        instanceRepo.save(inst);

        if (!dockerStopped || !portReleased) {
            System.err.println("cleanupAndReleasePort: PARTIAL CLEANUP for instance " + instanceId + 
                    " docker=" + dockerStopped + " port=" + portReleased);
        } else {
            System.out.println("cleanupAndReleasePort: SUCCESS for instance " + instanceId);
        }
    }

    /**
     * Check if port is available by checking Docker and system usage
     */
    private boolean isPortAvailable(int port) {
        // 1. First check if Docker is already using this port
        if (isPortUsedByDocker(port)) {
            return false;
        }

        // 2. Then check if system can bind to this port
        try (ServerSocket socket = new ServerSocket(port)) {
            socket.setReuseAddress(true);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Check if Docker is already using this port on the host (running or stopped containers)
     */
    private boolean isPortUsedByDocker(int port) {
        try {
            // Check both running and stopped containers
            ProcessBuilder pb = new ProcessBuilder(
                    "docker", "ps", "-a",
                    "--format", "{{.Ports}}"
            );

            Process process = pb.start();
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream())
            );

            String line;
            while ((line = reader.readLine()) != null) {
                // Handle multiple port format patterns Docker can produce:
                // 0.0.0.0:30001->22/tcp, :::30001->22/tcp, 30001/tcp, 0.0.0.0:30001
                if (line.contains(":" + port + "->") ||
                    line.contains(":" + port + "/") ||
                    line.matches("^" + port + "/.*") ||
                    line.matches(".*:?" + port + "$")) {
                    return true; // Port is already mapped by Docker
                }
            }

            process.waitFor();
            return false;

        } catch (Exception e) {
            // If we can't check Docker, assume port might be in use
            System.err.println("Warning: Could not check Docker port usage: " + e.getMessage());
            return true; // Be conservative
        }
    }
    /**
     * Load currently allocated ports from database on startup
     */
    private void loadAllocatedPorts() {
        List<ChallengeInstanceEntity> runningInstances =
                instanceRepo.findAll().stream()
                        .filter(inst -> "RUNNING".equals(inst.getStatus()))
                        .toList();

        for (ChallengeInstanceEntity inst : runningInstances) {
            allocatedPorts.add(inst.getSshPort());
        }

        System.out.println("Loaded " + allocatedPorts.size() + " allocated ports from database");
    }

    // ===== UTILITY METHODS =====

    private String generateFlag(String challengeId) {
        byte[] random = new byte[8];
        new SecureRandom().nextBytes(random);
        StringBuilder sb = new StringBuilder();
        for (byte b : random) sb.append(String.format("%02x", b));
        return "FLAG{" + challengeId + "_" + sb + "}";
    }

    public String sha256(String s) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes());
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}