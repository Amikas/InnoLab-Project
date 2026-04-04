package at.fhtw.ctfbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDto {
    private Long id;
    private String title;
    private String description;
    private String slug;
    private String difficulty;
    private Integer estimatedMinutes;
    private Integer orderIndex;
    private Boolean isPublished;
    private List<ModuleDto> modules;
}
