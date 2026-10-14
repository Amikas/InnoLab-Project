package at.fhtw.ctfbackend.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(CategoryService.class);

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
        String nameDe = jsonNode.has("nameDe") ? jsonNode.get("nameDe").asText("") : null;
        String summary = jsonNode.has("summary") ? jsonNode.get("summary").asText("") : "";
        String summaryDe = jsonNode.has("summaryDe") ? jsonNode.get("summaryDe").asText("") : null;
        String fileUrl = jsonNode.has("fileUrl") ? jsonNode.get("fileUrl").asText("") : "";

        if (categoryRepository.existsById(id)) {
            return "Category already exists.";
        }

        CategoryEntity categoryEntity = new CategoryEntity(id, name, summary, fileUrl);
        categoryEntity.setNameDe(nameDe);
        categoryEntity.setSummaryDe(summaryDe);

        try {
            categoryRepository.save(categoryEntity);
            return "OK";
        } catch (Exception e) {
            logger.error("Error saving category '{}': {}", id, e.getMessage());
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
        CategoryDto dto = new CategoryDto(
                entity.getId(),
                entity.getName(),
                entity.getSummary(),
                entity.getFileUrl()
        );
        dto.setNameDe(entity.getNameDe());
        dto.setSummaryDe(entity.getSummaryDe());
        return dto;
    }
}
