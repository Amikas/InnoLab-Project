package at.fhtw.ctfbackend.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void adminStateConflictReturns409() {
        AdminStateConflictException ex = new AdminStateConflictException("Cannot demote yourself");

        ResponseEntity<Map<String, String>> response = handler.handleAdminStateConflict(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Cannot demote yourself", response.getBody().get("error"));
    }
}
