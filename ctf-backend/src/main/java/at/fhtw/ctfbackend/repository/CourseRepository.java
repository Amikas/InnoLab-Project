package at.fhtw.ctfbackend.repository;

import at.fhtw.ctfbackend.entity.CourseEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<CourseEntity, Long> {

    Optional<CourseEntity> findBySlug(String slug);

    List<CourseEntity> findByIsPublishedTrueOrderByOrderIndexAsc();

    @Query("SELECT c FROM CourseEntity c LEFT JOIN FETCH c.modules m LEFT JOIN FETCH m.lessons WHERE c.slug = :slug AND c.isPublished = true")
    Optional<CourseEntity> findBySlugWithModulesAndLessons(String slug);

    boolean existsBySlug(String slug);
}
