package at.fhtw.ctfbackend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChallengeDto {
    private String id;
    private String title;
    private String titleDe;
    private String description;
    private String descriptionDe;
    private String category;
    private String difficulty;
    private Integer points;
    private String downloadUrl;
    private Boolean solved = false;
    private Boolean requiresInstance = false;
    private String[] hints;
    private String[] hintsDe;
    private String challengeFolderPath;
    private String dockerFilesJson;

    public ChallengeDto(String id, String title, String description,
                        String category, String difficulty, Integer points,
                        String downloadUrl) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.difficulty = difficulty;
        this.points = points;
        this.downloadUrl = downloadUrl;
    }
}
