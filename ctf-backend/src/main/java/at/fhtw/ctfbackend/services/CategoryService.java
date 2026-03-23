package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.entity.CategoryEntity;
import at.fhtw.ctfbackend.external.ConfluenceClient;
import at.fhtw.ctfbackend.dto.CategoryDto;
import at.fhtw.ctfbackend.repository.CategoryRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service layer for managing category operations.
 * Handles category creation, listing, and integration with Confluence.
 */
@Service
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final ConfluenceClient confluenceClient;
    private final ObjectMapper objectMapper;

    /**
     * Constructor with dependency injection.
     *
     * @param categoryRepository Repository for category persistence
     * @param confluenceClient Client for fetching Confluence data
     */
    public CategoryService(CategoryRepository categoryRepository, ConfluenceClient confluenceClient) {
        this.categoryRepository = categoryRepository;
        this.confluenceClient = confluenceClient;
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Retrieves all categories from the database.
     *
     * @return List of all categories as model objects
     */
    public List<CategoryDto> listAll() {
        return categoryRepository.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Creates one or more categories from JSON input.
     * Supports both single category object and array of categories.
     *
     * @param json JSON string containing category data
     * @return Success/error message
     * @throws JsonProcessingException if JSON parsing fails
     */
    public String createCategory(String json) throws JsonProcessingException {
        JsonNode rootNode = objectMapper.readTree(json);

        // Validate JSON is not null
        if (rootNode.isNull()) {
            throw new IllegalArgumentException("Invalid JSON: null value provided");
        }

        // Handle array of categories
        if (rootNode.isArray()) {
            return createMultipleCategories(rootNode);
        }

        // Handle single category object
        return createSingleCategory(rootNode);
    }

    /**
     * Creates multiple categories from a JSON array.
     * Stops processing on first error and returns error message.
     *
     * @param arrayNode JSON array containing category objects
     * @return Success message if all created, error message on first failure
     */
    private String createMultipleCategories(JsonNode arrayNode) {
        for (JsonNode node : arrayNode) {
            String result = processCategoryNode(node);

            // Stop on first error
            if (!result.equals("OK")) {
                return result;
            }
        }
        return "All categories created successfully.";
    }

    /**
     * Creates a single category from a JSON object.
     *
     * @param objectNode JSON object containing category data
     * @return Success or error message
     */
    private String createSingleCategory(JsonNode objectNode) {
        String result = processCategoryNode(objectNode);

        if (!result.equals("OK")) {
            return result;
        }

        return "Category created successfully.";
    }

    /**
     * Processes a single category JSON node and persists it to the database.
     * Validates required fields, checks for duplicates, fetches Confluence data.
     *
     * @param jsonNode JSON node containing category data
     * @return "OK" if successful, error message otherwise
     */
    private String processCategoryNode(JsonNode jsonNode) {
        // Validate required fields
        validateRequiredFields(jsonNode);

        // Extract fields from JSON
        String id = jsonNode.get("id").asText();
        String name = jsonNode.get("name").asText();
        String pageId = jsonNode.get("pageId").asText();

        // Check if category already exists BEFORE attempting to save
        // This prevents UPDATE behavior and ensures proper duplicate detection
        if (categoryRepository.existsById(id)) {
            return "Category already exists.";
        }

        // Fetch summary from Confluence
        String summary = confluenceClient.fetchSummaryFromConfluence(pageId);

        // Construct Confluence page URL
        String fileUrl = buildConfluenceUrl(pageId);

        // Create and save entity
        CategoryEntity categoryEntity = new CategoryEntity(id, name, summary, fileUrl);

        try {
            categoryRepository.save(categoryEntity);
            return "OK";
        } catch (Exception e) {
            // Log the error and return user-friendly message
            System.err.println("Error saving category '" + id + "': " + e.getMessage());
            return "Failed to save category: " + e.getMessage();
        }
    }

    /**
     * Validates that all required fields are present in the JSON node.
     *
     * @param jsonNode JSON node to validate
     * @throws IllegalArgumentException if any required field is missing
     */
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

        if (!jsonNode.has("pageId") || jsonNode.get("pageId").asText().isBlank()) {
            throw new IllegalArgumentException("Missing or empty required field: pageId");
        }
    }

    /**
     * Constructs the Confluence page URL from a page ID.
     *
     * @param pageId Confluence page identifier
     * @return Full URL to the Confluence page
     */
    private String buildConfluenceUrl(String pageId) {
        return "https://technikum-wien-team-kjev9g23.atlassian.net/wiki/spaces/C/pages/" + pageId;
    }

    /**
     * Converts a CategoryEntity to a Category model object.
     *
     * @param entity Entity from database
     * @return Category model object
     */
    private CategoryDto toDto(CategoryEntity entity) {
        return new CategoryDto(
                entity.getId(),
                entity.getName(),
                entity.getSummary(),
                entity.getFileUrl()
        );
    }
}