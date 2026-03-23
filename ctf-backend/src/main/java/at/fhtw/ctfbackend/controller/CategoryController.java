package at.fhtw.ctfbackend.controller;


import at.fhtw.ctfbackend.dto.CategoryDto;
import at.fhtw.ctfbackend.services.CategoryService;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryDto> getCategories() {return categoryService.listAll();}

    @PostMapping("/create")
    public String createCategory(@RequestBody String body) throws JsonProcessingException {
        return categoryService.createCategory(body);
    }

}
