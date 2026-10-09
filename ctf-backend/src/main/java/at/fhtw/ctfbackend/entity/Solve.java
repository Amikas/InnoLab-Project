package at.fhtw.ctfbackend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "solves",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"username", "challenge_id"})
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Solve {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserEntity user;

    // Deliberately a plain string, not a JPA relationship: solve history
    // must survive challenge deletion (the FK constraint was dropped).
    @Column(name = "challenge_id", nullable = false)
    private String challengeId;

    // Snapshot of the challenge title, kept so history still renders after
    // the challenge row is gone.
    @Column(name = "challenge_title")
    private String challengeTitle;

    @CreationTimestamp
    @Column(name = "solved_at", updatable = false)
    private LocalDateTime solvedAt;

    @Column(name = "points_earned")
    private Integer pointsEarned = 0;

    public Solve(UserEntity user, ChallengeEntity challenge, Integer pointsEarned) {
        this.user = user;
        this.username = user.getUsername();
        this.challengeId = challenge.getId();
        this.challengeTitle = challenge.getTitle();
        this.pointsEarned = pointsEarned;
    }
}
