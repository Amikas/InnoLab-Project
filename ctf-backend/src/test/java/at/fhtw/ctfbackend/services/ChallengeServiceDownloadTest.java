package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.HintRevealRepository;
import at.fhtw.ctfbackend.repository.SolveRepository;
import at.fhtw.ctfbackend.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChallengeServiceDownloadTest {

    private final ChallengeRepository repo = mock(ChallengeRepository.class);
    private final ChallengeService service = new ChallengeService(
            repo,
            mock(ChallengeFileStorageService.class),
            mock(SolveRepository.class),
            mock(HintRevealRepository.class),
            mock(EnvironmentService.class),
            mock(UserRepository.class));

    @Test
    void namesDownloadAfterSlugifiedTitle() {
        byte[] content = {1, 2, 3};
        ChallengeEntity entity = ChallengeEntity.builder()
                .id("hidden-in-source-123")
                .title("Hidden in Source")
                .downloadFile(content)
                .downloadExtension("txt")
                .build();
        when(repo.findById("hidden-in-source-123")).thenReturn(Optional.of(entity));

        ChallengeService.DownloadFile download = service.getDownload("hidden-in-source-123");

        assertArrayEquals(content, download.content());
        assertEquals("hidden-in-source.txt", download.filename());
    }

    @Test
    void transliteratesGermanCharacters() {
        ChallengeEntity entity = ChallengeEntity.builder()
                .id("grosse-flagge-123")
                .title("Größe & Spaß")
                .downloadFile(new byte[]{1})
                .downloadExtension("pdf")
                .build();
        when(repo.findById("grosse-flagge-123")).thenReturn(Optional.of(entity));

        assertEquals("groesse-spass.pdf", service.getDownload("grosse-flagge-123").filename());
    }

    @Test
    void fallsBackToTheChallengeIdWhenTheTitleHasNoSlug() {
        byte[] zip = {0x50, 0x4B, 0x03, 0x04};
        ChallengeEntity entity = ChallengeEntity.builder()
                .id("web-101")
                .title("日本語")
                .downloadFile(zip)
                .build();
        when(repo.findById("web-101")).thenReturn(Optional.of(entity));

        assertEquals("web-101.zip", service.getDownload("web-101").filename());
    }

    @Test
    void detectsTheExtensionWhenItWasNeverStored() {
        ChallengeEntity entity = ChallengeEntity.builder()
                .id("legacy-1")
                .title("Legacy PDF")
                .downloadFile(new byte[]{0x25, 0x50, 0x44, 0x46})
                .build();
        when(repo.findById("legacy-1")).thenReturn(Optional.of(entity));

        assertEquals("legacy-pdf.pdf", service.getDownload("legacy-1").filename());
    }

    @Test
    void returnsNoFilenameWhenThereIsNoContent() {
        ChallengeEntity entity = ChallengeEntity.builder()
                .id("empty-1")
                .title("Empty")
                .build();
        when(repo.findById("empty-1")).thenReturn(Optional.of(entity));

        ChallengeService.DownloadFile download = service.getDownload("empty-1");

        assertNull(download.content());
        assertNull(download.filename());
    }

    @Test
    void rejectsUnknownChallenges() {
        when(repo.findById("missing")).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> service.getDownload("missing"));
    }
}
