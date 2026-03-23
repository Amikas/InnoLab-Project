package at.fhtw.ctfbackend.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ChallengeInstanceResponse {
    private String instanceId;
    private String username;
    private String challengeId;
    private String containerName;
    private String flagHash;
    private Instant createdAt;
    private Instant expiresAt;
    private String status;
    private Integer sshPort;

    public ChallengeInstanceResponse(String instanceId, String username, String challengeId,
                                     String containerName, String flagHash, Instant createdAt,
                                     Instant expiresAt, String status, Integer sshPort) {
        this.instanceId = instanceId;
        this.username = username;
        this.challengeId = challengeId;
        this.containerName = containerName;
        this.flagHash = flagHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.status = status;
        this.sshPort = sshPort;
    }
}
