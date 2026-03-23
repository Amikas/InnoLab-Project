package at.fhtw.ctfbackend.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SolveResponse {
    private Long id;
    private String username;
    private String challengeId;
    private String challengeTitle;
    private LocalDateTime solvedAt;
    private Integer pointsEarned;

    public SolveResponse(Long id, String username, String challengeId, 
                        String challengeTitle, LocalDateTime solvedAt, Integer pointsEarned) {
        this.id = id;
        this.username = username;
        this.challengeId = challengeId;
        this.challengeTitle = challengeTitle;
        this.solvedAt = solvedAt;
        this.pointsEarned = pointsEarned;
    }
}
