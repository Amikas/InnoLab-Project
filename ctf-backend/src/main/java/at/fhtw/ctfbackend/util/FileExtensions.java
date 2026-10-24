package at.fhtw.ctfbackend.util;

import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/** Derives safe download file extensions from uploads, stored assets, or file signatures. */
public final class FileExtensions {

    private static final int MAX_LENGTH = 16;

    private FileExtensions() {
    }

    /** Normalizes an extension (no dot, lowercase, alphanumeric, at most 16 chars). Returns null if unusable. */
    public static String normalize(String extension) {
        if (extension == null) {
            return null;
        }
        String cleaned = extension.trim().toLowerCase(Locale.ROOT);
        while (cleaned.startsWith(".")) {
            cleaned = cleaned.substring(1);
        }
        return cleaned.matches("[a-z0-9]{1," + MAX_LENGTH + "}") ? cleaned : null;
    }

    /** Extracts a usable extension from a client-supplied filename. */
    public static String fromFilename(String filename) {
        if (filename == null) {
            return null;
        }
        String name = filename.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        int dot = name.lastIndexOf('.');
        if (dot <= 0 || dot == name.length() - 1) {
            return null;
        }
        return normalize(name.substring(dot + 1));
    }

    /** Extension for a new upload: use the filename when sane, otherwise sniff the content. */
    public static String forUpload(String filename, byte[] data) {
        String fromName = fromFilename(filename);
        return fromName != null ? fromName : detect(data);
    }

    /** Extension for stored content: declared value first, then the asset path, then the bytes. */
    public static String forStored(String declared, String assetPath, byte[] data) {
        String normalized = normalize(declared);
        if (normalized != null) {
            return normalized;
        }
        String fromPath = fromFilename(assetPath);
        if (fromPath != null && !"bin".equals(fromPath)) {
            return fromPath;
        }
        return detect(data);
    }

    /** Best-effort detection from magic bytes; text falls back to txt and unknown data to bin. */
    public static String detect(byte[] data) {
        if (data == null || data.length == 0) {
            return "bin";
        }
        if (startsWith(data, 0x50, 0x4B, 0x03, 0x04)
                || startsWith(data, 0x50, 0x4B, 0x05, 0x06)
                || startsWith(data, 0x50, 0x4B, 0x07, 0x08)) {
            return "zip";
        }
        if (startsWith(data, 0x25, 0x50, 0x44, 0x46)) {
            return "pdf";
        }
        if (startsWith(data, 0x89, 0x50, 0x4E, 0x47)) {
            return "png";
        }
        if (startsWith(data, 0xFF, 0xD8, 0xFF)) {
            return "jpg";
        }
        if (startsWith(data, 0x47, 0x49, 0x46, 0x38)) {
            return "gif";
        }
        if (startsWith(data, 0x42, 0x4D)) {
            return "bmp";
        }
        if (startsWith(data, 0x1F, 0x8B)) {
            return "gz";
        }
        if (startsWith(data, 0x52, 0x61, 0x72, 0x21)) {
            return "rar";
        }
        if (startsWith(data, 0x37, 0x7A, 0xBC, 0xAF)) {
            return "7z";
        }
        return looksLikeText(data) ? "txt" : "bin";
    }

    private static boolean startsWith(byte[] data, int... signature) {
        if (data.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if ((data[i] & 0xFF) != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean looksLikeText(byte[] data) {
        for (byte value : data) {
            if (value == 0) {
                return false;
            }
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(data));
            return true;
        } catch (CharacterCodingException e) {
            return false;
        }
    }
}
