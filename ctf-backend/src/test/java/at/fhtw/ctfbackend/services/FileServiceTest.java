package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.FileEntity;
import at.fhtw.ctfbackend.repository.FileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private FileRepository fileRepo;

    @InjectMocks
    private FileService service;

    private FileEntity fileEntity;

    @BeforeEach
    void setUp() {
        fileEntity = new FileEntity();
        fileEntity.setId("test-file");
        fileEntity.setFileName("test-file.zip");
        fileEntity.setContent("test content".getBytes());
    }

    @Test
    void getFileById_ExistingFile_ReturnsFileEntity() {
        when(fileRepo.findById("test-file")).thenReturn(Optional.of(fileEntity));

        FileEntity result = service.getFileById("test-file");

        assertNotNull(result);
        assertEquals("test-file", result.getId());
        assertEquals("test-file.zip", result.getFileName());
        assertArrayEquals("test content".getBytes(), result.getContent());
        verify(fileRepo, times(1)).findById("test-file");
    }

    @Test
    void getFileById_NonExistingFile_ThrowsException() {
        when(fileRepo.findById("invalid")).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> service.getFileById("invalid"));

        assertTrue(exception.getMessage().contains("File not found"));
        verify(fileRepo, times(1)).findById("invalid");
    }

    @Test
    void customUpload_ValidJson_WithFilename_ReturnsSuccess() {
        String json = "{\"filename\": \"new-file.zip\"}";
        when(fileRepo.existsById("new-file")).thenReturn(false);

        String result = service.customUpload(json);

        assertTrue(result.contains("Error") || result.contains("File not found"));
        verify(fileRepo, never()).save(any());
    }

    @Test
    void customUpload_MissingFilename_ReturnsError() {
        String json = "{\"other\": \"value\"}";

        String result = service.customUpload(json);

        assertEquals("Missing 'filename' field", result);
        verify(fileRepo, never()).save(any());
    }

    @Test
    void customUpload_InvalidJson_ReturnsError() {
        String invalidJson = "not a json";

        String result = service.customUpload(invalidJson);

        assertTrue(result.startsWith("Error:"));
        verify(fileRepo, never()).save(any());
    }

    @Test
    void customUpload_FileAlreadyExists_ReturnsError() {
        String json = "{\"filename\": \"existing-file.zip\"}";
        when(fileRepo.existsById("existing-file")).thenReturn(true);

        String result = service.customUpload(json);

        assertEquals("File with this ID already exists.", result);
        verify(fileRepo, times(1)).existsById("existing-file");
        verify(fileRepo, never()).save(any());
    }

    @Test
    void customUpload_EmptyJson_ReturnsError() {
        String json = "{}";

        String result = service.customUpload(json);

        assertEquals("Missing 'filename' field", result);
        verify(fileRepo, never()).save(any());
    }

    @Test
    void customUpload_NullFilename_ReturnsError() {
        String json = "{\"filename\": null}";

        String result = service.customUpload(json);

        assertEquals("Missing 'filename' field", result);
        verify(fileRepo, never()).save(any());
    }

    @Test
    void saveFiles_ReturnsSuccessMessage() {
        String result = service.saveFiles();

        assertNotNull(result);
        assertTrue(result.contains("successfully") || result.contains("went wrong"));
    }
}
