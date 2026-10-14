package at.fhtw.ctfbackend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseListDto {
    private Long id;
    private String title;
    private String titleDe;
    private String description;
    private String descriptionDe;
    private String slug;
    private String difficulty;
    private Integer estimatedMinutes;
    private Integer moduleCount;
    private Integer lessonCount;
}
