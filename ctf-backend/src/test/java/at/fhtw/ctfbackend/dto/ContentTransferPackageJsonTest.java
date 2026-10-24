package at.fhtw.ctfbackend.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ContentTransferPackageJsonTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void readsVersionOneChallengesThatStillCarryOriginalFilename() throws Exception {
        String json = """
                {
                  "id": "web-101",
                  "title": "Web 101",
                  "requiresInstance": false,
                  "originalFilename": "old-bundle.zip",
                  "downloadAsset": "assets/downloads/web-101.bin",
                  "contextAssets": []
                }
                """;

        ContentTransferPackage.Challenge challenge = mapper.readValue(json, ContentTransferPackage.Challenge.class);

        assertEquals("web-101", challenge.id());
        assertNull(challenge.downloadExtension());
    }

    @Test
    void readsVersionTwoDownloadExtension() throws Exception {
        String json = """
                {
                  "id": "web-101",
                  "title": "Web 101",
                  "requiresInstance": false,
                  "downloadExtension": "pdf",
                  "downloadAsset": "assets/downloads/web-101.pdf",
                  "contextAssets": []
                }
                """;

        ContentTransferPackage.Challenge challenge = mapper.readValue(json, ContentTransferPackage.Challenge.class);

        assertEquals("pdf", challenge.downloadExtension());
    }
}
