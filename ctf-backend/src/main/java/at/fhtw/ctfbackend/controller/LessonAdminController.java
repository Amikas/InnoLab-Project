package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.LessonDto;
import at.fhtw.ctfbackend.entity.LessonEntity;
import at.fhtw.ctfbackend.entity.ModuleEntity;
import at.fhtw.ctfbackend.repository.LessonRepository;
import at.fhtw.ctfbackend.repository.ModuleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/lessons")
public class LessonAdminController {

    private final LessonRepository lessonRepository;
    private final ModuleRepository moduleRepository;

    public LessonAdminController(LessonRepository lessonRepository, ModuleRepository moduleRepository) {
        this.lessonRepository = lessonRepository;
        this.moduleRepository = moduleRepository;
    }

    @GetMapping
    public List<LessonDto> getAllLessons() {
        return lessonRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LessonDto> getLessonById(@PathVariable Long id) {
        return lessonRepository.findById(id)
                .map(this::toDto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<LessonDto> createLesson(@RequestBody LessonDto lessonDto) {
        if (lessonDto.getModuleId() == null) {
            return ResponseEntity.badRequest().build();
        }
        
        ModuleEntity module = moduleRepository.findById(lessonDto.getModuleId())
                .orElse(null);
        if (module == null) {
            return ResponseEntity.notFound().build();
        }
        
        LessonEntity entity = toEntity(lessonDto);
        entity.setModule(module);
        LessonEntity saved = lessonRepository.save(entity);
        return ResponseEntity.ok(toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LessonDto> updateLesson(@PathVariable Long id, @RequestBody LessonDto lessonDto) {
        LessonEntity existing = lessonRepository.findById(id).orElse(null);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }

        existing.setTitle(lessonDto.getTitle());
        existing.setTitleDe(lessonDto.getTitleDe());
        existing.setContent(lessonDto.getContent());
        existing.setContentDe(lessonDto.getContentDe());
        existing.setDetailedExplanation(lessonDto.getDetailedExplanation());
        existing.setDetailedExplanationDe(lessonDto.getDetailedExplanationDe());
        existing.setVideoUrl(lessonDto.getVideoUrl());
        existing.setOrderIndex(lessonDto.getOrderIndex() != null ? lessonDto.getOrderIndex() : 0);
        existing.setChallengeIds(lessonDto.getChallengeIds());
        existing.setCodeExamplesJson(lessonDto.getCodeExamplesJson());
        existing.setRealWorldIncidents(lessonDto.getRealWorldIncidents());
        if (lessonDto.getRealWorldIncidentsDe() != null)
            existing.setRealWorldIncidentsDe(lessonDto.getRealWorldIncidentsDe());
        existing.setExternalReferences(lessonDto.getExternalReferences());
        existing.setKeyTakeaways(lessonDto.getKeyTakeaways());
        if (lessonDto.getKeyTakeawaysDe() != null)
            existing.setKeyTakeawaysDe(lessonDto.getKeyTakeawaysDe());

        if (lessonDto.getModuleId() != null) {
            ModuleEntity module = moduleRepository.findById(lessonDto.getModuleId()).orElse(null);
            if (module != null) {
                existing.setModule(module);
            }
        }

        LessonEntity saved = lessonRepository.save(existing);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLesson(@PathVariable Long id) {
        if (!lessonRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        lessonRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/module/{moduleId}")
    public List<LessonDto> getLessonsByModule(@PathVariable Long moduleId) {
        return lessonRepository.findByModuleIdOrderByOrderIndexAsc(moduleId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @PutMapping("/{id}/challenges")
    public ResponseEntity<LessonDto> updateLessonChallenges(@PathVariable Long id, @RequestBody Map<String, List<String>> payload) {
        return lessonRepository.findById(id)
                .map(lesson -> {
                    lesson.setChallengeIds(payload.get("challengeIds"));
                    LessonEntity saved = lessonRepository.save(lesson);
                    return ResponseEntity.ok(toDto(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    private LessonDto toDto(LessonEntity entity) {
        return LessonDto.builder()
                .id(entity.getId())
                .moduleId(entity.getModule().getId())
                .title(entity.getTitle())
                .titleDe(entity.getTitleDe())
                .content(entity.getContent())
                .contentDe(entity.getContentDe())
                .detailedExplanation(entity.getDetailedExplanation())
                .detailedExplanationDe(entity.getDetailedExplanationDe())
                .videoUrl(entity.getVideoUrl())
                .orderIndex(entity.getOrderIndex())
                .challengeIds(entity.getChallengeIds())
                .codeExamplesJson(entity.getCodeExamplesJson())
                .realWorldIncidents(entity.getRealWorldIncidents())
                .realWorldIncidentsDe(entity.getRealWorldIncidentsDe())
                .externalReferences(entity.getExternalReferences())
                .keyTakeaways(entity.getKeyTakeaways())
                .keyTakeawaysDe(entity.getKeyTakeawaysDe())
                .build();
    }

    private LessonEntity toEntity(LessonDto dto) {
        return LessonEntity.builder()
                .title(dto.getTitle())
                .titleDe(dto.getTitleDe())
                .content(dto.getContent())
                .contentDe(dto.getContentDe())
                .detailedExplanation(dto.getDetailedExplanation())
                .detailedExplanationDe(dto.getDetailedExplanationDe())
                .videoUrl(dto.getVideoUrl())
                .orderIndex(dto.getOrderIndex() != null ? dto.getOrderIndex() : 0)
                .challengeIds(dto.getChallengeIds())
                .codeExamplesJson(dto.getCodeExamplesJson())
                .realWorldIncidents(dto.getRealWorldIncidents())
                .realWorldIncidentsDe(dto.getRealWorldIncidentsDe())
                .externalReferences(dto.getExternalReferences())
                .keyTakeaways(dto.getKeyTakeaways())
                .keyTakeawaysDe(dto.getKeyTakeawaysDe())
                .build();
    }
}
