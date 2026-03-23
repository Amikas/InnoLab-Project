package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.ModuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<ModuleEntity, Long> {

    List<ModuleEntity> findByCourseIdOrderByOrderIndexAsc(Long courseId);

    void deleteByCourseId(Long courseId);
}
