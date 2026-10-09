package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.ChallengeInstanceEntity;
import at.fhtw.ctfbackend.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChallengeInstanceRepository extends JpaRepository<ChallengeInstanceEntity, String> {

    List<ChallengeInstanceEntity> findByUsernameAndChallengeIdAndStatus(
            String username,
            String challengeId,
            String status
    );

    List<ChallengeInstanceEntity> findByUserAndChallengeIdAndStatus(
            UserEntity user,
            String challengeId,
            String status
    );

    Optional<ChallengeInstanceEntity> findByInstanceId(String instanceId);

    List<ChallengeInstanceEntity> findByChallengeId(String challengeId);
}
