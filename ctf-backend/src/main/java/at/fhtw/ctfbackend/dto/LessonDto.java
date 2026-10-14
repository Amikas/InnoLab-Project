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
    private String titleDe;
    private String content;
    private String contentDe;
    private String detailedExplanation;
    private String detailedExplanationDe;
    private String videoUrl;
    private Integer orderIndex;
    private List<String> challengeIds;
    private List<String> codeExamplesJson;
    private List<String> realWorldIncidents;
    private List<String> realWorldIncidentsDe;
    private List<String> externalReferences;
    private List<String> keyTakeaways;
    private List<String> keyTakeawaysDe;
}
