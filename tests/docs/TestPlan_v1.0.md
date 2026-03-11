# Test Plan - CTF Training Platform Backend
## FH Technikum Wien - Innolab Project

---

## 1. Document Information

|Field | Value                             |
|------|-----------------------------------|
| **Project** | CTF Training Platform Backend     |
| **Tester** | Hashkeil Mahmoud - Kluge Viktoria |
| **Version** | v1.0                              |
| **Date** | October 2025                      |
| **Test Period** | --                                |

---

## 2. Introduction

### 2.1 Purpose
This document defines the testing strategy and approach for the CTF (Capture The Flag) Backend system developed for FH Technikum Wien. The system allows students to authenticate using their FH credentials via the university LDAP server and participate in CTF challenges.

### 2.2 Scope
Testing covers backend & frontend REST API endpoints, authentication, challenge management, flag submission, and security controls.

### 2.3 Project Context
- **Project Type:** Innolab - Semester Project
- **Goal:** Establish CTF training environment at FH Technikum Wien
- **Team Size:** 8 members
- **Technology:** Java 21, Spring Boot 3.4, PostgreSQL

---

## 3. Test Objectives

1. **Verify FH LDAP Authentication** - Students can log in with FH credentials
2. **Validate Challenge Management** - Challenges can be listed and downloaded
3. **Test Flag Submission Logic** - Correct flags are accepted, incorrect rejected
4. **Ensure Security** - No SQL injection, XSS, or path traversal vulnerabilities
5. **Achieve Code Coverage** - Minimum 80% line coverage
6. **Document Defects** - All bugs found are logged and tracked

---

## 4. Scope Definition

### 4.1 Features IN SCOPE 

| Feature | Description | Priority |
|---------|-----------|----------|
| **Authentication** | FH LDAP login via university credentials | HIGH     |
| **JWT Token Generation** | Secure token creation and validation | HIGH     |
| **Challenge Listing** | GET /api/challenges returns all challenges | HIGH     |
| **Challenge Download** | GET /api/challenges/{id}/download returns ZIP | MEDIUM   |
| **Flag Submission** | POST /api/flags/submit validates flags | HIGH     |
| **Solve Tracking** | System tracks which user solved which challenge | HIGH     |
| **Category Management** | GET /api/categories, POST /api/categories/create | MEDIUM   |
| **File Operations** | Upload/download challenge files | MEDIUM   |
| **Security Controls** | SQL injection, XSS, path traversal prevention | HIGH     |
| **Frontend testing** |  | HIGH     |

### 4.2 Features OUT OF SCOPE 

- Frontend testing (separate project)
- LDAP server configuration (infrastructure)
- Performance/Load testing (future work)
- User registration (students use FH accounts)
- Docker container testing
- Confluence integration testing

---

## 5. Test Strategy

### 5.1 Test Levels

#### A. **Unit Testing** 
**Target:** Services, Utilities, Business Logic

| Component | Tests | Coverage Target |
|-----------|-------|-----------------|
| FlagService | 12-15 | 90%+ |
| ChallengeService | 8-10 | 85%+ |
| CategoryService | 8-10 | 85%+ |
| FileService | 6-8 | 80%+ |
| JwtUtil | 8-10 | 90%+ |
| **Total** | **45-50** | **85%+** |

**Tools:** JUnit 5, Mockito, AssertJ

#### B. **Integration Testing** 
**Target:** Controllers, REST APIs, Security

| Component | Tests | Focus |
|-----------|-------|-------|
| AuthController | 8-10 | Login flow, JWT generation |
| FlagController | 12-15 | Flag submission, validation |
| ChallengeController | 6-8 | Challenge CRUD, download |
| CategoryController | 6-8 | Category management |
| SecurityTests | 15-20 | SQL injection, XSS, auth |
| **Total** | **45-50** | **Full request-response cycle** |

**Tools:** Spring Test, MockMvc, REST Assured (optional)

### 5.2 Risk-Based Approach

#### HIGH RISK Areas (Test First) 
1. **Authentication/Authorization**
    - Risk: Unauthorized access to system
    - Impact: Security breach, data exposure
    - Tests: 20+ tests covering all auth scenarios

2. **Flag Validation Logic**
    - Risk: Wrong flags accepted or correct flags rejected
    - Impact: Core functionality broken, unfair competition
    - Tests: 15+ tests with edge cases

3. **File Download Security**
    - Risk: Path traversal vulnerability
    - Impact: Access to system files (/etc/passwd)
    - Tests: 10+ tests for path traversal attacks

#### MEDIUM RISK Areas 
4. **Challenge Management** - 8 tests
5. **Category Management** - 8 tests
6. **Solve Tracking** - 6 tests

#### LOW RISK Areas 
7. **DTOs/Models** - Minimal testing (getters/setters)
8. **Configuration Classes** - Excluded from coverage

---

## 6. Test Environment

### 6.1 Test Infrastructure

```yaml
Environment: Test (Isolated)
Database: H2 In-Memory Database
Authentication: Mock authentication for testing
Port: Random (for parallel tests)
```

### 6.2 Test Data

**Test Users:**
```
Username: testuser (password: password)
Username: player1 (password: test123)
Username: admin (password: admin123)
```

**Test Challenges:**
```
ID: web-101, Flag: flag{leet_xss}
ID: rev-201, Flag: flag{reverse_master}
```

### 6.3 Tools & Frameworks

| Tool | Version | Purpose |
|------|---------|---------|
| Java | 21      | Language |
| Spring Boot | 3.4.4   | Framework |
| JUnit | 5.10.x  | Test framework |
| Mockito | 5.x     | Mocking |
| JaCoCo | 0.8.11  | Coverage |
| AssertJ | 3.x     | Assertions |
| H2 Database | Latest  | Test DB |
| Maven | 4.+     | Build tool |

---

## 7. Entry and Exit Criteria

### 7.1 Entry Criteria
- [ ] Development code is committed and stable
- [ ] Test environment (H2, mock authentication) is configured
- [ ] Test data (users, challenges) is prepared
- [ ] All dependencies (pom.xml) are resolved
- [ ] Test structure (src/test/java) is created

### 7.2 Exit Criteria 
- [ ] All HIGH priority tests pass (100%)
- [ ] MEDIUM priority tests pass (95%+)
- [ ] Code coverage ≥ 80% overall
- [ ] No CRITICAL or HIGH severity bugs open
- [ ] All test documentation complete
- [ ] Test execution report generated
- [ ] Security tests pass (no vulnerabilities)

---

## 8. Test Deliverables

### 8.1 Mandatory Deliverables

1. **Test Code** (`src/test/java/`)
    - 80-100 automated tests
    - Unit + Integration tests
    - Security tests

2. **Test Plan** (this document)
    - Strategy, scope, schedule
    - 5-7 pages

3. **Test Execution Report**
    - Results, coverage, defects
    - 4-5 pages with metrics

4. **Traceability Matrix**
    - Requirements → Test Cases mapping
    - CSV format, 15-20 requirements

5. **Code Coverage Report**
    - JaCoCo HTML report
    - Summary document (1-2 pages)

6. **How to Run Tests**
    - Simple guide with commands
    - 1 page

### 8.2 Optional Deliverables

7. **Bug Reports** (if issues found)
8. **Security Findings Report**
9. **Recommendations for Future Work**

---

## 9. Test Schedule 

### Week ?: Unit Testing (? days)
| Day | Tasks | Goal |
|-----|-------|------|
| 1 | Setup environment, first test | 5 tests pass |
| 2-3 | FlagService tests | 12-15 tests |
| 4 | ChallengeService tests | 8-10 tests |
| 5 | CategoryService tests | 8-10 tests |
| 6 | FileService + JwtUtil tests | 12-15 tests |
| 7 | Review, coverage check | 45-50 total, 80%+ coverage |

**Week 1 Milestone:** 45-50 unit tests, 80%+ coverage

### Week ?: Integration & Security Testing (? days)
| Day | Tasks | Goal |
|-----|-------|------|
| 8 | Integration test setup | Framework ready |
| 9 | AuthController tests | 8-10 tests |
| 10 | FlagController tests | 12-15 tests |
| 11 | Challenge & Category tests | 12-16 tests |
| 12 | Security tests (SQL injection) | 8-10 tests |
| 13 | Security tests (XSS, path traversal) | 7-10 tests |
| 14 | Final testing, bug fixes | All tests pass |

**Week 2 Milestone:** 45-50 integration tests, security validated

### Week ?: Documentation (?)
| Day | Tasks | Deliverable |
|-----|-------|-------------|
| 15-16 | Write test execution report | 4-5 pages |
| 17 | Create traceability matrix | CSV complete |
| 18 | Coverage summary, bug reports | All docs done |
| 19 | Final review, presentation prep | Ready to present |

**Week 3 Milestone:** All documentation complete

---

## 10. Risk Analysis

### 10.1 Testing Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FH LDAP unavailable during tests | Low | High | Use mock authentication for tests |
| Database connection issues | Low | High | Use H2 in-memory DB |
| Time constraint (solo testing) | High | Medium | Focus on HIGH risk areas first |
| Lack of test data | Low | Medium | Create test data loaders |
| Bugs found late | Medium | High | Test HIGH risk features first |

### 10.2 Project Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incomplete requirements | Medium | Use existing API as specification |
| Changing scope | High | Lock scope after Week 1 |
| Infrastructure issues | Medium | Use Docker for consistency |

---

## 11. Test Metrics & KPIs

### 11.1 Metrics to Track

1. **Test Execution Metrics**
    - Total tests executed
    - Pass rate (target: 95%+)
    - Failed tests
    - Blocked tests

2. **Coverage Metrics**
    - Line coverage (target: 80%+)
    - Branch coverage (target: 75%+)
    - Method coverage (target: 85%+)

3. **Defect Metrics**
    - Total defects found
    - Defects by severity (Critical/High/Medium/Low)
    - Defect density (defects per 1000 LOC)

4. **Quality Metrics**
    - % of requirements covered by tests
    - Time to fix defects
    - Test automation percentage (100%)

### 11.2 Success Criteria

**Minimum Acceptable:**
- 70+ automated tests
-  80%+ code coverage
-  0 critical bugs open
-  All security tests pass

**Target (Good):**
- 85+ automated tests
- 85%+ code coverage
- 0 high/critical bugs
Complete documentation

**Excellent (Stretch):**
-  100+ automated tests
-  90%+ code coverage
-  CI/CD pipeline setup
-  Performance baseline documented

---

## 12. Roles & Responsibilities

| Role | Name                             | Responsibilities |
|------|----------------------------------|------------------|
| **Tester/QA** | Hashkeil Mahmoud, Kluge Viktoria | Test design, execution, reporting |
| **Developer** |                                  | Fix bugs, support testing |
| **Project Owner** | Alexander Mense                  | Review reports, approve scope |

---

## 13. Assumptions & Dependencies

### 13.1 Assumptions
- FH LDAP server is available in production
- Challenge files (ZIPs) are provided in `src/main/resources/files/`
- PostgreSQL database is configured in production
- Confluence API is optional (not critical for testing)

### 13.2 Dependencies
- Spring Boot 3.2+ installed
- Java 21+ installed
- Maven 4.+ installed
- Access to codebase (Git repository)
- Test environment setup (H2, mock authentication)

---

## 14. Sign-off

### 14.1 Approval

| Role | Name             | Signature | Date |
|------|------------------|-----------|------|
| Test Lead | Hashkeil Mahmoud, Kluge Viktoria | _________ | _____ |
| Project Owner |      | _________ | _____ |
| Technical Lead |       | _________ | _____ |

---

## 15. Appendices

### A. Test Naming Convention
```
methodName_StateUnderTest_ExpectedBehavior

Examples:
- validateFlag_WithCorrectFlag_ReturnsTrue
- submitFlag_WithoutAuthentication_ReturnsUnauthorized
- getChallenges_WhenNoChallengesExist_ReturnsEmptyList
```

### B. Coverage Exclusions
Certain classes are excluded from code coverage analysis to maintain meaningful metrics that reflect actual business logic testing.

```
- Entity classes (CategoryEntity, ChallengeEntity, etc.)
- Model/DTO classes (Category, Challenge, etc.)
- Configuration classes (SecurityConfig, etc.)
- Main application class (CtfBackendApplication)
- External API clients (ConfluenceClient)
```

### C. Test Data Locations
```
ctf-backend/
 src/
    main/java/at/fhtw/ctfbackend/...   application code
    test/java/at/fhtw/ctfbackend/...   test classes
          service/
          controller/
          repository/

```

---

**Document Version:** v1.0  
**Last Updated:**  October 2025  
**Status:**  