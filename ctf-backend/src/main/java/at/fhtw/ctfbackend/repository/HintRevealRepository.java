package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.HintReveal;
import at.fhtw.ctfbackend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HintRevealRepository extends JpaRepository<HintReveal, Long> {

    List<HintReveal> findByUsernameAndChallengeId(String username, String challengeId);

    List<HintReveal> findByUserAndChallengeId(UserEntity user, String challengeId);

    Optional<HintReveal> findByUsernameAndChallengeIdAndHintIndex(String username, String challengeId, Integer hintIndex);

    Optional<HintReveal> findByUserAndChallengeIdAndHintIndex(UserEntity user, String challengeId, Integer hintIndex);

    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM HintReveal h WHERE h.challenge.id = :challengeId")
    int deleteByChallengeId(@Param("challengeId") String challengeId);

}
