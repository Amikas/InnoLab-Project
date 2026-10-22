package at.fhtw.ctfbackend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The course catalogue used to be readable without a session. It is student
 * content, so anonymous callers must be rejected before the controller runs.
 */
@SpringBootTest(properties = "JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CourseControllerAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousGetCoursesReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousGetCourseBySlugReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/courses/owasp-top-10"))
                .andExpect(status().isUnauthorized());
    }
}
