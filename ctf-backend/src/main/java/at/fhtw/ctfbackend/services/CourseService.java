package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.dto.CourseDto;
import at.fhtw.ctfbackend.dto.CourseListDto;
import at.fhtw.ctfbackend.dto.LessonDto;
import at.fhtw.ctfbackend.dto.ModuleDto;
import at.fhtw.ctfbackend.entity.CourseEntity;
import at.fhtw.ctfbackend.entity.LessonEntity;
import at.fhtw.ctfbackend.entity.ModuleEntity;
import at.fhtw.ctfbackend.repository.CourseRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CourseService {
    private final CourseRepository courseRepository;

    public CourseService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public List<CourseListDto> listPublishedCourses() {
        return courseRepository.findByIsPublishedTrueOrderByOrderIndexAsc().stream()
                .map(this::toListDto)
                .collect(Collectors.toList());
    }

    public Optional<CourseDto> getCourseBySlug(String slug) {
        return courseRepository.findBySlugWithModulesAndLessons(slug)
                .map(this::toDto);
    }

    public Optional<CourseDto> getCourseById(Long id) {
        return courseRepository.findById(id)
                .map(this::toDto);
    }

    private CourseListDto toListDto(CourseEntity entity) {
        int moduleCount = entity.getModules() != null ? entity.getModules().size() : 0;
        int lessonCount = entity.getModules() != null 
                ? entity.getModules().stream()
                    .mapToInt(m -> m.getLessons() != null ? m.getLessons().size() : 0)
                    .sum() 
                : 0;

        return CourseListDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .difficulty(entity.getDifficulty())
                .estimatedMinutes(entity.getEstimatedMinutes())
                .moduleCount(moduleCount)
                .lessonCount(lessonCount)
                .build();
    }

    private CourseDto toDto(CourseEntity entity) {
        List<ModuleDto> modules = entity.getModules() != null
                ? entity.getModules().stream()
                    .map(this::toModuleDto)
                    .collect(Collectors.toList())
                : List.of();

        return CourseDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .difficulty(entity.getDifficulty())
                .estimatedMinutes(entity.getEstimatedMinutes())
                .orderIndex(entity.getOrderIndex())
                .modules(modules)
                .build();
    }

    private ModuleDto toModuleDto(ModuleEntity entity) {
        List<LessonDto> lessons = entity.getLessons() != null
                ? entity.getLessons().stream()
                    .map(this::toLessonDto)
                    .collect(Collectors.toList())
                : List.of();

        return ModuleDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .orderIndex(entity.getOrderIndex())
                .lessons(lessons)
                .build();
    }

    private LessonDto toLessonDto(LessonEntity entity) {
        return LessonDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .videoUrl(entity.getVideoUrl())
                .orderIndex(entity.getOrderIndex())
                .challengeIds(entity.getChallengeIds())
                .build();
    }
}
