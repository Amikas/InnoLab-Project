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
public class ModuleDto {
    private Long id;
    private Long courseId;
    private String title;
    private String content;
    private Integer orderIndex;
    private List<LessonDto> lessons;
}
