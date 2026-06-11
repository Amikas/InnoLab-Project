package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.config.GlobalMockConfig;
import at.fhtw.ctfbackend.services.FileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;


import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FileController.class)
@Import(GlobalMockConfig.class)
@WithMockUser
class FileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FileService fileService;

    @BeforeEach
    void resetMocks() {
        reset(fileService);
    }

    @Test
    void downloadFile_ExistingFile_ReturnsFile() throws Exception {
        mockMvc.perform(get("/api/files/download/test.zip"))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadFile_NonExistingFile_ReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/files/download/nonexistent.zip"))
                .andExpect(status().isNotFound());
    }

    @Test
    void downloadFile_PathTraversalAttempt_HandlesSecurely() throws Exception {
        mockMvc.perform(get("/api/files/download/../../../etc/passwd"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadFile_NoBody_CallsSaveFiles() throws Exception {
        when(fileService.saveFiles()).thenReturn("Files saved successfully.");

        mockMvc.perform(post("/api/files/upload")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().string("Files saved successfully."));

        verify(fileService, times(1)).saveFiles();
        verify(fileService, never()).customUpload(anyString());
    }

    @Test
    void uploadFile_EmptyBody_CallsSaveFiles() throws Exception {
        when(fileService.saveFiles()).thenReturn("Files saved successfully.");

        mockMvc.perform(post("/api/files/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().string("Files saved successfully."));

        verify(fileService, times(1)).saveFiles();
        verify(fileService, never()).customUpload(anyString());
    }

    @Test
    void uploadFile_BlankBody_CallsSaveFiles() throws Exception {
        when(fileService.saveFiles()).thenReturn("Files saved successfully.");

        mockMvc.perform(post("/api/files/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("   ")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().string("Files saved successfully."));

        verify(fileService, times(1)).saveFiles();
        verify(fileService, never()).customUpload(anyString());
    }

    @Test
    void uploadFile_WithJsonBody_CallsCustomUpload() throws Exception {
        String requestBody = "{\"filename\":\"test.zip\"}";
        when(fileService.customUpload(requestBody))
                .thenReturn("File saved successfully.");

        mockMvc.perform(post("/api/files/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(content().string("File saved successfully."));

        verify(fileService, times(1)).customUpload(requestBody);
        verify(fileService, never()).saveFiles();
    }
}
