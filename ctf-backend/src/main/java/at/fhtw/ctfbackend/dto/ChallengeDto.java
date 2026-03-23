package at.fhtw.ctfbackend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChallengeDto {
    private String id;
    private String title;
    private String description;
    private String category;
    private String difficulty;
    private Integer points;
    private String downloadUrl;
    private String originalFilename;
    private Boolean solved = false;
    private Boolean requiresInstance = false;
    private String[] hints;
    private String challengeFolderPath;
    private String dockerFilesJson;

    public ChallengeDto(String id, String title, String description,
                        String category, String difficulty, Integer points,
                        String downloadUrl, String originalFilename) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.difficulty = difficulty;
        this.points = points;
        this.downloadUrl = downloadUrl;
        this.originalFilename = originalFilename;
    }

    public ChallengeDto(String id, String title, String description,
                        String category, String difficulty, Integer points,
                        String downloadUrl, String originalFilename,
                        Boolean requiresInstance) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.difficulty = difficulty;
        this.points = points;
        this.downloadUrl = downloadUrl;
        this.originalFilename = originalFilename;
        this.requiresInstance = requiresInstance != null ? requiresInstance : false;
    }

    public ChallengeDto(String id, String title, String description,
                        String category, String difficulty, Integer points,
                        String downloadUrl, String originalFilename,
                        Boolean requiresInstance,
                        String challengeFolderPath,
                        String dockerFilesJson,
                        String[] hints) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.category = category;
        this.difficulty = difficulty;
        this.points = points;
        this.downloadUrl = downloadUrl;
        this.originalFilename = originalFilename;
        this.requiresInstance = requiresInstance != null ? requiresInstance : false;
        this.challengeFolderPath = challengeFolderPath;
        this.dockerFilesJson = dockerFilesJson;
        this.hints = hints;
    }
}
