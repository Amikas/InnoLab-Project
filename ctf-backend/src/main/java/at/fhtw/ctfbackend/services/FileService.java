package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.FileEntity;
import at.fhtw.ctfbackend.repository.FileRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;

@Service
public class FileService {
    private final FileRepository fileRepo;
    ObjectMapper objectMapper;


    public FileService(FileRepository fileRepo) {
        this.fileRepo = fileRepo;
        this.objectMapper = new ObjectMapper();
    }

    public FileEntity getFileById(String id) {
        return fileRepo.findById(id).orElseThrow(() -> new RuntimeException("File not found: " + id));
    }

    public String saveFiles() {
        try {
            var resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:/files/*.zip");

            for (Resource r : resources) {
                String filename = r.getFilename();
                String id = filename.replace(".zip", "");

                if (!fileRepo.existsById(id)) {
                    byte[] content;
                    try (InputStream in = r.getInputStream()) {
                        content = in.readAllBytes();
                    }

                    FileEntity fileEntity = new FileEntity();
                    fileEntity.setId(id);
                    fileEntity.setFileName(filename);
                    fileEntity.setContent(content);

                    fileRepo.save(fileEntity);
                }
            }

            return "Files saved successfully.";
        } catch (Exception e) {
            return "Something went wrong: " + e.getMessage();
        }
    }

    public String customUpload(String body) {
        try {
            // Parse the JSON body
            JsonNode jsonNode = objectMapper.readTree(body);

            if (!jsonNode.has("filename") || jsonNode.get("filename").isNull()) {
                return "Missing 'filename' field";
            }

            String filename = jsonNode.get("filename").asText();
            if (filename.isBlank()) {
                return "Missing 'filename' field";
            }

            String id = filename.replace(".zip", "");

            // Check if the file already exists in the DB
            if (fileRepo.existsById(id)) {
                return "File with this ID already exists.";
            }

            // Load the specific file from classpath
            var resolver = new PathMatchingResourcePatternResolver();
            Resource resource = resolver.getResource("classpath:/files/" + filename);

            if (!resource.exists()) {
                return "File not found in classpath.";
            }

            // Read and save content
            byte[] content;
            try (InputStream in = resource.getInputStream()) {
                content = in.readAllBytes();
            }

            FileEntity fileEntity = new FileEntity();
            fileEntity.setId(id);
            fileEntity.setFileName(filename);
            fileEntity.setContent(content);

            fileRepo.save(fileEntity);

            return "File saved successfully.";

        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }


}
