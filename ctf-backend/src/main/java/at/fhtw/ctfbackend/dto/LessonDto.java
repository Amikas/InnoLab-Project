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
public class LessonDto {
    private Long id;
    private Long moduleId;
    private String title;
    private String content;
    private String detailedExplanation;
    private String videoUrl;
    private Integer orderIndex;
    private List<String> challengeIds;
    private List<String> codeExamplesJson;
    private List<String> realWorldIncidents;
    private List<String> externalReferences;
}
