package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.ModuleDto;
import at.fhtw.ctfbackend.entity.CourseEntity;
import at.fhtw.ctfbackend.entity.ModuleEntity;
import at.fhtw.ctfbackend.repository.CourseRepository;
import at.fhtw.ctfbackend.repository.ModuleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/modules")
public class ModuleAdminController {

    private final ModuleRepository moduleRepository;
    private final CourseRepository courseRepository;

    public ModuleAdminController(ModuleRepository moduleRepository, CourseRepository courseRepository) {
        this.moduleRepository = moduleRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public List<ModuleDto> getAllModules() {
        return moduleRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModuleDto> getModuleById(@PathVariable Long id) {
        return moduleRepository.findById(id)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ModuleDto> createModule(@RequestBody ModuleDto moduleDto) {
        if (moduleDto.getCourseId() == null) {
            return ResponseEntity.badRequest().build();
        }
        
        CourseEntity course = courseRepository.findById(moduleDto.getCourseId())
                .orElse(null);
        if (course == null) {
            return ResponseEntity.notFound().build();
        }
        
        ModuleEntity entity = toEntity(moduleDto);
        entity.setCourse(course);
        ModuleEntity saved = moduleRepository.save(entity);
        return ResponseEntity.ok(toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ModuleDto> updateModule(@PathVariable Long id, @RequestBody ModuleDto moduleDto) {
        ModuleEntity existing = moduleRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        existing.setTitle(moduleDto.getTitle());
        existing.setContent(moduleDto.getContent());
        existing.setOrderIndex(moduleDto.getOrderIndex() != null ? moduleDto.getOrderIndex() : 0);

        if (moduleDto.getCourseId() != null) {
            CourseEntity course = courseRepository.findById(moduleDto.getCourseId()).orElse(null);
            if (course != null) {
                existing.setCourse(course);
            }
        }

        ModuleEntity saved = moduleRepository.save(existing);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteModule(@PathVariable Long id) {
        if (!moduleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        moduleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/course/{courseId}")
    public List<ModuleDto> getModulesByCourse(@PathVariable Long courseId) {
        return moduleRepository.findByCourseIdOrderByOrderIndexAsc(courseId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private ModuleDto toDto(ModuleEntity entity) {
        return ModuleDto.builder()
                .id(entity.getId())
                .courseId(entity.getCourse().getId())
                .title(entity.getTitle())
                .content(entity.getContent())
                .orderIndex(entity.getOrderIndex())
                .build();
    }

    private ModuleEntity toEntity(ModuleDto dto) {
        return ModuleEntity.builder()
                .title(dto.getTitle())
                .content(dto.getContent())
                .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : 0)
                .build();
    }
}
