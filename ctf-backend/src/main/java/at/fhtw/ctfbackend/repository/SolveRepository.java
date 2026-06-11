package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.Solve;
import at.fhtw.ctfbackend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
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

    //  FIXED - Custom queries for challenge ID navigation
    @Query("SELECT s FROM Solve s WHERE s.challenge.id = :challengeId")
    List<Solve> findByChallengeId(@Param("challengeId") String challengeId);

    @Query("SELECT s FROM Solve s WHERE s.username = :username AND s.challenge.id = :challengeId")
    Optional<Solve> findByUsernameAndChallengeId(@Param("username") String username, @Param("challengeId") String challengeId);

    @Query("SELECT s FROM Solve s WHERE s.user = :user AND s.challenge.id = :challengeId")
    Optional<Solve> findByUserAndChallengeId(@Param("user") UserEntity user, @Param("challengeId") String challengeId);

    @Query("SELECT COUNT(s) FROM Solve s WHERE s.challenge.id = :challengeId")
    long countByChallengeId(@Param("challengeId") String challengeId);

    // Count how many challenges a user has solved
    long countByUsername(String username);

    long countByUser(UserEntity user);

    //  FIXED - Use Pageable
    @Query("SELECT s FROM Solve s ORDER BY s.solvedAt DESC")
    List<Solve> findRecentSolves(Pageable pageable);

    // Find solves within a time range
    List<Solve> findBySolvedAtBetween(LocalDateTime start, LocalDateTime end);

    //  FIXED - Use Pageable with limit
    @Query("SELECT s.username, COUNT(s) as solveCount FROM Solve s GROUP BY s.username ORDER BY solveCount DESC")
    List<Object[]> findTopSolvers(Pageable pageable);

    @Query("SELECT s.challenge.id, COUNT(s) as solveCount FROM Solve s GROUP BY s.challenge.id ORDER BY solveCount DESC")
    List<Object[]> findMostSolvedChallenges(Pageable pageable);

    //  FIXED - Add @Param
    @Query("SELECT s FROM Solve s WHERE s.challenge.category = :category")
    List<Solve> findByCategory(@Param("category") String category);

    @Query("SELECT s FROM Solve s WHERE s.challenge.difficulty = :difficulty")
    List<Solve> findByDifficulty(@Param("difficulty") String difficulty);
}
