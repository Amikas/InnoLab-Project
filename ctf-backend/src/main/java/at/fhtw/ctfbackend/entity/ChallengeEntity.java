package at.fhtw.ctfbackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "challenges")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChallengeEntity {
    @Id
    private String id;

    private String title;
    @Column(columnDefinition = "TEXT")
    private String description;
    /** German (de) variants. Nullable for backwards compatibility; English is the fallback. */
    private String titleDe;
    @Column(columnDefinition = "TEXT")
    private String descriptionDe;
    private String category;
    private String difficulty;
    private Integer points;

    @Lob
    private byte[] downloadZip;

    private String originalFilename;
    private boolean requiresInstance;
    private String flag;



    // Store file metadata as JSON
    @Column(columnDefinition = "TEXT")
    private String dockerFilesJson;

    // Store the actual folder path on disk
    private String challengeFolderPath;

    // Store hints as JSON array
    @Column(columnDefinition = "TEXT")
    private String hintsJson;

    /** German hints as JSON array (optional, falls back to hintsJson). */
    @Column(columnDefinition = "TEXT")
    private String hintsJsonDe;

    public byte[] getDownload() {
        return downloadZip;
    }

    public void setDownload(byte[] download) {
        this.downloadZip = download;
    }
}
