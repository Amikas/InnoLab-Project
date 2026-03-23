package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.CategoryEntity;
import at.fhtw.ctfbackend.dto.CategoryDto;
import at.fhtw.ctfbackend.repository.CategoryRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
        this.objectMapper = new ObjectMapper();
    }

    public List<CategoryDto> listAll() {
        return categoryRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public String createCategory(String json) throws JsonProcessingException {
        JsonNode rootNode = objectMapper.readTree(json);

        if (rootNode.isNull()) {
            throw new IllegalArgumentException("Invalid JSON: null value provided");
        }

        if (rootNode.isArray()) {
            return createMultipleCategories(rootNode);
        }

        return createSingleCategory(rootNode);
    }

    private String createMultipleCategories(JsonNode arrayNode) {
        for (JsonNode node : arrayNode) {
            String result = processCategoryNode(node);
            if (!result.equals("OK")) {
                return result;
            }
        }
        return "All categories created successfully.";
    }

    private String createSingleCategory(JsonNode objectNode) {
        String result = processCategoryNode(objectNode);
        if (!result.equals("OK")) {
            return result;
        }
        return "Category created successfully.";
    }

    private String processCategoryNode(JsonNode jsonNode) {
        validateRequiredFields(jsonNode);

        String id = jsonNode.get("id").asText();
        String name = jsonNode.get("name").asText();
        String summary = jsonNode.has("summary") ? jsonNode.get("summary").asText("") : "";
        String fileUrl = jsonNode.has("fileUrl") ? jsonNode.get("fileUrl").asText("") : "";

        if (categoryRepository.existsById(id)) {
            return "Category already exists.";
        }

        CategoryEntity categoryEntity = new CategoryEntity(id, name, summary, fileUrl);

        try {
            categoryRepository.save(categoryEntity);
            return "OK";
        } catch (Exception e) {
            System.err.println("Error saving category '" + id + "': " + e.getMessage());
            return "Failed to save category: " + e.getMessage();
        }
    }

    private void validateRequiredFields(JsonNode jsonNode) {
        if (jsonNode.isEmpty()) {
            throw new IllegalArgumentException("Empty JSON object provided");
        }

        if (!jsonNode.has("id") || jsonNode.get("id").asText().isBlank()) {
            throw new IllegalArgumentException("Missing or empty required field: id");
        }

        if (!jsonNode.has("name") || jsonNode.get("name").asText().isBlank()) {
            throw new IllegalArgumentException("Missing or empty required field: name");
        }
    }

    private CategoryDto toDto(CategoryEntity entity) {
        return new CategoryDto(
                entity.getId(),
                entity.getName(),
                entity.getSummary(),
                entity.getFileUrl()
        );
    }
}
