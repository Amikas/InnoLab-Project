package at.fhtw.ctfbackend.controller;

import at.fhtw.ctfbackend.dto.CourseDto;
import at.fhtw.ctfbackend.dto.CourseListDto;
import at.fhtw.ctfbackend.services.CourseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {
    private final CourseService courseService;

    public CourseController(CourseService courseService) {
        this.courseService = courseService;
    }

    @GetMapping
    public List<CourseListDto> getCourses() {
        return courseService.listPublishedCourses();
    }

    @GetMapping("/{slug}")
    public ResponseEntity<CourseDto> getCourse(@PathVariable String slug) {
        return courseService.getCourseBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
