package at.fhtw.ctfbackend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.*;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryEntity {

    @Id
    @Column(length = 100, nullable = false, unique = true)
    private String id;

    @Column(length = 2000, nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String summary;

    /** German variants (optional, English is the fallback). */
    @Column(length = 2000)
    private String nameDe;

    @Column(columnDefinition = "TEXT")
    private String summaryDe;

    @Column(name = "file_url", length = 2000)
    private String fileUrl;

    /** Backwards-compatible 4-arg constructor (pre-i18n call sites). */
    public CategoryEntity(String id, String name, String summary, String fileUrl) {
        this.id = id;
        this.name = name;
        this.summary = summary;
        this.fileUrl = fileUrl;
    }
}