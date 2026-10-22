package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.services.ContentTransferService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/content-transfer")
public class ContentTransferController {
    private final ContentTransferService service;
    private final ObjectMapper mapper;

    public ContentTransferController(ContentTransferService service, ObjectMapper mapper) {
        this.service = service;
        this.mapper = mapper;
    }

    @PostMapping(value = "/export", produces = "application/zip")
    public ResponseEntity<byte[]> export(@RequestBody(required = false) ContentTransferService.ExportRequest request) {
        byte[] archive = service.exportPackage(request);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("innolab-content.zip").build().toString())
                .contentLength(archive.length)
                .body(archive);
    }

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ContentTransferService.Preview preview(@RequestPart("file") MultipartFile file) throws IOException {
        return service.preview(file.getBytes());
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ContentTransferService.ImportResult importPackage(@RequestPart("file") MultipartFile file,
                                                               @RequestParam("decisions") String decisionsJson) throws IOException {
        List<ContentTransferService.Decision> decisions = mapper.readValue(decisionsJson,
                new TypeReference<>() { });
        return service.importPackage(file.getBytes(), decisions);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> invalidPackage(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
    }
}
