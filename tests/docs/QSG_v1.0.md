# 48_Capture (CTF Backend)

**Document:** Complete QA Documentation (QSG + Test Plan + Test Summary + Appendices)  
**Prepared By:** Hashkeil Mahmoud  
**Version:** 1.0  
**Date:** 30 October 2025  
**Institution:** FH Technikum Wien – Innovation Lab 1

---

## 1. Purpose

This document provides a **complete QA package** for the *48_Capture (CTF Backend)* project.  
It combines the Quick Start Guide (QSG), Test Plan, Test Summary Report, and Appendices into one unified Markdown document for simplicity, transparency, and traceability.

---

#  Section I – Quick Start Guide (QSG)

## 1. Environment Prerequisites

| Tool | Version | Purpose |
|------|----------|----------|
| **Docker Desktop** | ≥ 4.x | Run PostgreSQL and backend containers |
| **Java** | 21 | Build and run backend |
| **Maven** | 3.9+ | Build & test management |
| **Postman / Newman** | Latest | API testing |
| **Git** | Latest | Clone repository |
| **IDE (IntelliJ / VS Code)** | Optional | Code inspection & debugging |

---

## 2. Repository Structure

```
InnoLab-Project/
 ctf-backend/              → Backend Spring Boot application
 ctf-frontend-next/        → Frontend Next.js application
 ctf-terminal/             → CLI and tools
 tests/                    → QA documentation
 docker-compose.yml        → Starts complete environment

```

---

## 3. Setup Instructions

1. **Clone Repository**
   ```bash
   git clone https://github.com/3Llmm/InnoLab-Project.git
   cd InnoLab-Project
   ```

2. **Start Containers**
   ```bash
   docker-compose up -d
   ```

3. **Verify Services**
   ```bash
   docker ps
   ```

4. **Access API**
    * Base URL: `http://localhost:3000`
    * Example: `GET /api/challenges`

---

## 4. Test Execution

### A. Automated Unit & Integration Tests

```bash
  mvn clean test
```

Reports: `target/surefire-reports/`  
Coverage: `target/site/jacoco/index.html` 

---

### B. Postman / Newman API Tests

```bash
```

Reports (optional):
```bash
```

---

### C. Manual Tests

Located in:
```
InnoLab-Project/
 tests/docs/CTF_Testing.xlsx
```

Includes detailed steps, expected results, and pass/fail status.

---

## 5. Common Test Users

| Role | Username | Password | Notes |
|------|----------|----------|-------|
| **Student** | `testuser` | `password` | Valid FH user |

---

## 6. Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Port 8080 in use | Conflict | Stop previous service |
| 401 Unauthorized | Expired token | Re-login |
| Database error | Postgres down | `docker restart postgres` |
| LDAP connection failed | FH LDAP unavailable | Check network connection |

---

#  Section II – Test Plan Overview

## 1. Objectives

* Validate functionality, performance, and security of the CTF backend.
* Ensure all endpoints conform to business and security requirements.
* Provide regression-ready automated test coverage.

---

## 2. Scope

| In Scope                                                                | Out of Scope |
|-------------------------------------------------------------------------|--------------|
| API endpoints & Frontend (`/api/challenges`, `/api/flags/submit`, etc.) |  |
| FH LDAP Authentication                                                  | Registration (handled externally by FH) |
| Database integration                                                    | External Confluence API reliability |
| File operations                                                         | UI/UX validation |


---

## 3. Test Types

* **Unit Testing** – Logic and service validation (JUnit 5)
* **Integration Testing** – API-to-DB and LDAP flow validation
* **Functional Testing** – End-to-end Postman scenarios
* **Security Testing** – SQLi, XSS, Path Traversal, JWT
* **Regression Testing** – Automated retests before release

---

## 4. Test Environment

| Component | Technology |
|-----------|------------|
| Backend | Java 21 + Spring Boot |
| Database | PostgreSQL via Docker |
| Authentication | FH LDAP Server (External) |
| Test Framework | JUnit 5, Mockito, JaCoCo |
| Automation | Postman / Newman |
| CI Tool | Maven CLI (local) |

---

#  Section III – Test Case Summary (Excerpt)

| Scenario ID | Title | Priority | Category | Test Cases |
|-------------|-------|----------|----------|------------|
| SC-001 | Successful Student Login | HIGH | Authentication | TC-AUTH-001, 007, 008 |
| SC-004 | Browse Challenges | HIGH | Challenges | TC-CHAL-001, 002, 005, 006 |
| SC-006 | Correct Flag Submission | HIGH | Flags | TC-FLAG-001, 014, 016 |
| SC-012 | Path Traversal Prevention | HIGH | Security | TC-FILE-003, 004, 005 |
| SC-014 | XSS Prevention | MEDIUM | Security | TC-SEC-006, 007 |

---

## Example Test Case

| Field | Description |
|-------|-------------|
| **Test Case ID** | TC-AUTH-001 |
| **Scenario** | SC-001 – Successful Student Login |
| **Preconditions** | FH LDAP server accessible; valid FH user exists |
| **Test Steps** | 1. Navigate to login<br>2. Enter credentials<br>3. Submit |
| **Test Data** | Username: testuser<br>Password: password |
| **Expected Result** | HTTP 200 OK; JWT token generated; redirect to dashboard |
| **Actual Result** | As expected |
| **Priority** | High |
| **Result** | Pass |

---

#  Section IV – Test Summary Report

## 1. Test Execution Overview

| Metric | Count |
|--------|-------|
| Total Test Cases | 60    |
| Executed | --    |
| Passed | --    |
| Failed | --    |
| Blocked | --    |
| Coverage | --    |

---

## 2. Key Findings

* to-do: Fill in after test execution


---

## 3. Defect Summary

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
to-do: Fill in after test execution
---

## 4. Recommendation

> System is **ready for Release Candidate testing**.  
> Continue automated regression integration via GitHub Actions or local CI pipeline before final deployment.

---

#  Section V – Appendices

## A. Test Naming Convention

**Format:**
```
methodName_StateUnderTest_ExpectedBehavior
```

**Examples:**

| Example Name | Description |
|--------------|-------------|
| `validateFlag_WithCorrectFlag_ReturnsTrue` | Checks correct flag returns true |
| `submitFlag_WithoutAuthentication_ReturnsUnauthorized` | Ensures missing JWT returns 401 |
| `getChallenges_WhenNoChallengesExist_ReturnsEmptyList` | Confirms empty DB returns empty list |
| `createCategory_WithValidInput_ReturnsSuccess` | Tests valid category creation returns OK |

---

## B. Coverage Exclusions

| Category | Examples | Reason |
|----------|----------|--------|
| **Entities** | `CategoryEntity`, `ChallengeEntity` | Only data mappings |
| **DTOs** | `Category`, `Challenge`, `FlagDTO` | No logic |
| **Config Classes** | `LdapConfig`, `SecurityConfig` | Verified indirectly |
| **Main Class** | `CtfBackendApplication` | Bootstraps only |
| **External Clients** | `ConfluenceClient` | Mocked in integration |

---

## C. Test Data and Source Locations

```
src/test/java/at/fhtw/ctfbackend
```

**Structure:**
```
 controller/
      AuthControllerTest.java
 service/
      FlagServiceTest.java
 repository/
      ChallengeRepositoryTest.java
 integration/
       CtfIntegrationTests.java
```

Test resources:
```
src/test/resources/
```

---

## D. Document References

| Document | Version | Description |
|----------|---------|-------------|
| Test Plan | v1.0 | Strategy and scope |
| Test Cases | v1.0 | All detailed test cases |
| Test Summary Report | v1.0 | Execution results summary |
| Quick Start Guide | v1.0 | Setup and execution instructions |

---

**Prepared By:** Hashkeil Mahmoud  
**Project:** *48_Capture (CTF Backend)*  
**Version:** v1.0  
**Date:**  October 2025  
**Status:** not yet finished