package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.Solve;
import at.fhtw.ctfbackend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SolveRepository extends JpaRepository<Solve, Long> {

    // Find all solves by username
    List<Solve> findByUsername(String username);

    List<Solve> findByUser(UserEntity user);

    // Native query for counting solves by challenge ID
    @Query(value = "SELECT COUNT(*) FROM solves WHERE challenge_id = :challengeId", nativeQuery = true)
    long countByChallengeIdNative(@Param("challengeId") String challengeId);

    @Query("SELECT s FROM Solve s WHERE s.challengeId = :challengeId")
    List<Solve> findByChallengeId(@Param("challengeId") String challengeId);

    @Query("SELECT s FROM Solve s WHERE s.username = :username AND s.challengeId = :challengeId")
    Optional<Solve> findByUsernameAndChallengeId(@Param("username") String username, @Param("challengeId") String challengeId);

    @Query("SELECT s FROM Solve s WHERE s.user = :user AND s.challengeId = :challengeId")
    Optional<Solve> findByUserAndChallengeId(@Param("user") UserEntity user, @Param("challengeId") String challengeId);

    @Query("SELECT COUNT(s) FROM Solve s WHERE s.challengeId = :challengeId")
    long countByChallengeId(@Param("challengeId") String challengeId);

    // Count how many challenges a user has solved
    long countByUsername(String username);

    long countByUser(UserEntity user);

    @Query("SELECT s FROM Solve s ORDER BY s.solvedAt DESC")
    List<Solve> findRecentSolves(Pageable pageable);

    // Find solves within a time range
    List<Solve> findBySolvedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT s.username, COUNT(s) as solveCount FROM Solve s GROUP BY s.username ORDER BY solveCount DESC")
    List<Object[]> findTopSolvers(Pageable pageable);

    @Query("SELECT s.challengeId, COUNT(s) as solveCount FROM Solve s GROUP BY s.challengeId ORDER BY solveCount DESC")
    List<Object[]> findMostSolvedChallenges(Pageable pageable);

    // History rows for deleted challenges have no live challenge row, so they
    // simply drop out of category/difficulty filters.
    @Query("SELECT s FROM Solve s WHERE s.challengeId IN (SELECT c.id FROM ChallengeEntity c WHERE c.category = :category)")
    List<Solve> findByCategory(@Param("category") String category);

    @Query("SELECT s FROM Solve s WHERE s.challengeId IN (SELECT c.id FROM ChallengeEntity c WHERE c.difficulty = :difficulty)")
    List<Solve> findByDifficulty(@Param("difficulty") String difficulty);

    // Backfills the title snapshot for solve rows recorded before the
    // challenge was deleted (legacy rows or rows created before this column).
    @Modifying(flushAutomatically = true)
    @Query("UPDATE Solve s SET s.challengeTitle = :title WHERE s.challengeId = :challengeId AND s.challengeTitle IS NULL")
    int snapshotChallengeTitle(@Param("challengeId") String challengeId, @Param("title") String title);
}
