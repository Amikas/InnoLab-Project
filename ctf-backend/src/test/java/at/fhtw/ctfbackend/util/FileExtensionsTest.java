package at.fhtw.ctfbackend.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class FileExtensionsTest {

    @Test
    void normalizesExtensions() {
        assertEquals("zip", FileExtensions.normalize(".ZIP"));
        assertEquals("tar", FileExtensions.normalize(" TAR "));
        assertNull(FileExtensions.normalize("../etc/passwd"));
        assertNull(FileExtensions.normalize(""));
        assertNull(FileExtensions.normalize("a".repeat(17)));
    }

    @Test
    void extractsExtensionsFromFilenames() {
        assertEquals("zip", FileExtensions.fromFilename("bundle.ZIP"));
        assertEquals("txt", FileExtensions.fromFilename("C:\\Users\\admin\\notes.txt"));
        assertEquals("gz", FileExtensions.fromFilename("archive.tar.gz"));
        assertNull(FileExtensions.fromFilename("Dockerfile"));
        assertNull(FileExtensions.fromFilename(".env"));
        assertNull(FileExtensions.fromFilename(null));
    }

    @Test
    void uploadsPreferTheFilenameAndFallBackToTheBytes() {
        assertEquals("pdf", FileExtensions.forUpload("brief.PDF", new byte[]{0x50, 0x4B}));
        assertEquals("zip", FileExtensions.forUpload("download", new byte[]{0x50, 0x4B, 0x03, 0x04}));
        assertEquals("txt", FileExtensions.forUpload(null, "hello".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    void storedContentPrefersDeclaredExtensionThenAssetPathThenBytes() {
        assertEquals("docx", FileExtensions.forStored("docx", "assets/downloads/id.bin", new byte[]{0x50, 0x4B}));
        assertEquals("pdf", FileExtensions.forStored(null, "assets/challenges/id/files/brief.pdf", new byte[]{0x50, 0x4B}));
        assertEquals("zip", FileExtensions.forStored(null, "assets/downloads/id.bin", new byte[]{0x50, 0x4B, 0x03, 0x04}));
    }

    @Test
    void detectsCommonSignatures() {
        assertEquals("zip", FileExtensions.detect(new byte[]{0x50, 0x4B, 0x03, 0x04}));
        assertEquals("pdf", FileExtensions.detect(new byte[]{0x25, 0x50, 0x44, 0x46}));
        assertEquals("png", FileExtensions.detect(new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47}));
        assertEquals("jpg", FileExtensions.detect(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}));
    }

    @Test
    void detectsTextAndUnknownBinary() {
        assertEquals("txt", FileExtensions.detect("flag{hello}\n".getBytes(StandardCharsets.UTF_8)));
        assertEquals("bin", FileExtensions.detect(new byte[]{0x00, 0x01, 0x02}));
        assertEquals("bin", FileExtensions.detect(null));
    }
}
