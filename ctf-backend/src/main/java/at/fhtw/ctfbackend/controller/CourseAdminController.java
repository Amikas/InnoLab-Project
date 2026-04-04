package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.CourseDto;
import at.fhtw.ctfbackend.entity.CourseEntity;
import at.fhtw.ctfbackend.repository.CourseRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/courses")
public class CourseAdminController {

    private final CourseRepository courseRepository;

    public CourseAdminController(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public CourseDto createCourse(@RequestBody CourseDto courseDto) {
        CourseEntity entity = toEntity(courseDto);
        CourseEntity saved = courseRepository.save(entity);
        return toDto(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CourseDto> updateCourse(@PathVariable Long id, @RequestBody CourseDto courseDto) {
        CourseEntity existing = courseRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        existing.setTitle(courseDto.getTitle());
        existing.setDescription(courseDto.getDescription());
        existing.setSlug(courseDto.getSlug());
        existing.setDifficulty(courseDto.getDifficulty());
        existing.setEstimatedMinutes(courseDto.getEstimatedMinutes());
        existing.setOrderIndex(courseDto.getOrderIndex() != null ? courseDto.getOrderIndex() : 0);
        existing.setIsPublished(courseDto.getIsPublished() != null ? courseDto.getIsPublished() : false);

        CourseEntity saved = courseRepository.save(existing);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable Long id) {
        if (!courseRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        courseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<CourseDto> publishCourse(@PathVariable Long id, @RequestBody Map<String, Boolean> payload) {
        return courseRepository.findById(id)
                .map(course -> {
                    course.setIsPublished(payload.get("published"));
                    CourseEntity saved = courseRepository.save(course);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private CourseDto toDto(CourseEntity entity) {
        return CourseDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .slug(entity.getSlug())
                .difficulty(entity.getDifficulty())
                .estimatedMinutes(entity.getEstimatedMinutes())
                .orderIndex(entity.getOrderIndex())
                .isPublished(entity.getIsPublished())
                .build();
    }

    private CourseEntity toEntity(CourseDto dto) {
        return CourseEntity.builder()
                .title(dto.getTitle())
                .description(dto.getDescription())
                .slug(dto.getSlug())
                .difficulty(dto.getDifficulty())
                .estimatedMinutes(dto.getEstimatedMinutes())
                .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : 0)
                .isPublished(dto.getIsPublished() != null ? dto.getIsPublished() : false)
                .build();
    }
}
