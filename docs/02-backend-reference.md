# Backend Reference

**Base path:** `ctf-backend/`
**Language:** Java 21
**Framework:** Spring Boot 3.4.4
**Build:** Maven 3.9.6 (`./mvnw`)

---

## Package Structure

```
at.fhtw.ctfbackend/
├── CtfbackendApplication.java          # @SpringBootApplication entry point
├── bootstrap/
│   ├── CategorySeeder.java             # Seeds default categories on startup
│   ├── UserDataBackfill.java           # Backfills user data on startup
│   └── (planned: ChallengeSeeder, CourseSeeder)
├── config/
│   ├── SecurityConfig.java             # Spring Security: CORS, JWT filter, role auth
│   ├── WebConfig.java                  # MVC CORS configuration
│   └── RateLimitConfig.java            # Bucket4j rate limit configuration
├── controller/                         # REST controllers (15 files)
├── dto/                                # Data Transfer Objects
├── entity/                             # JPA entities (11 files)
├── filter/
│   └── RateLimitFilter.java            # Per-user/per-IP rate limiting
├── repository/                         # Spring Data JPA repositories (11 files)
├── security/
│   ├── JwtUtil.java                    # JWT generation, parsing, validation
│   └── JwtAuthenticationFilter.java    # Extracts JWT from cookie, sets SecurityContext
└── services/                           # Business logic services (13 files)
```

---

## Controllers

### AuthController
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `POST /api/login` | POST | Public | LDAP auth, set JWT cookie |
| `POST /api/logout` | POST | Any | Clear auth cookie |
| `GET /api/user/me` | GET | Auth | Current user profile |
| `GET /api/auth/me` | GET | Auth | Alias for /api/user/me |
| `GET /api/auth/admin-check` | GET | Auth | Check admin + active status |

### ChallengeController (`/api/challenges`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/` | GET | Auth | List all challenges |
| `/{id}` | GET | Auth | Get challenge detail |
| `/{id}/download` | GET | Auth | Download challenge file |
| `/` | POST | Admin | Create challenge (multipart) |
| `/{id}` | PUT | Admin | Update challenge (multipart) |
| `/{id}` | DELETE | Admin | Delete challenge |
| `/admin/stats` | GET | Admin | Admin statistics |

### CategoryController (`/api/categories`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/` | GET | Auth | List all categories |
| `/create` | POST | Auth | Create category |

### FlagController (`/api/flags`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/submit` | POST | Auth | Submit flag, validate, record solve |

### SolveController (`/api/solves`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/me` | GET | Auth | User's solves |
| `/challenge/{challengeId}` | GET | Auth | Solvers for challenge |
| `/check/{challengeId}` | GET | Auth | Did user solve? |
| `/challenge/{challengeId}/count` | GET | Auth | Solve count |
| `/challenge/{challengeId}/stats` | GET | Auth | Challenge statistics |
| `/recent` | GET | Auth | Recent solves (feed) |
| `/top-solvers` | GET | Auth | Leaderboard |
| `/most-solved` | GET | Auth | Most solved challenges |
| `/category/{category}` | GET | Auth | Filter by category |
| `/difficulty/{difficulty}` | GET | Auth | Filter by difficulty |
| `/time-range` | GET | Auth | Filter by time range |
| `/me/stats` | GET | Auth | User statistics |
| `/user/{username}/stats` | GET | Auth | User stats by username |
| `/total-count` | GET | Auth | Total solve count |

### EnvironmentController (`/api/environment`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/start/{challengeId}` | POST | Auth | Start challenge container |
| `/build/{challengeId}` | POST | Auth | Build image + start container |
| `/instance/{instanceId}` | GET | Auth | Get instance status |
| `/stop/{instanceId}` | POST | Auth | Stop and cleanup instance |

### HintController (`/api/hints`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/reveal` | POST | Auth | Reveal a hint (time-locked) |
| `/status/{challengeId}` | GET | Auth | Get hint reveal status |

### FileController (`/api/files`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/download/{filename:.+}` | GET | Auth | Download file |
| `/upload` | POST | Auth | Upload file |

### CourseController (`/api/courses`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/` | GET | Auth | List published courses |
| `/{slug}` | GET | Auth | Get course by slug |

### HealthController (`/api`)
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/health` | GET | Public | Health check → "OK" |

### Admin Controllers

| Controller | Path | Endpoints |
|------------|------|-----------|
| AdminUserController | `/api/admin/users` | GET all, GET/{id}, PATCH/{id}, GET/admins, PUT/{username}, DELETE/{username} |
| CourseAdminController | `/api/admin/courses` | GET all, GET/{id}, POST, PUT/{id}, DELETE/{id}, PUT/{id}/publish |
| ModuleAdminController | `/api/admin/modules` | GET all, GET/{id}, POST, PUT/{id}, DELETE/{id}, GET/course/{courseId} |
| LessonAdminController | `/api/admin/lessons` | GET all, GET/{id}, POST, PUT/{id}, DELETE/{id}, GET/module/{moduleId}, PUT/{id}/challenges |

---

## Services

| Service | Key Responsibilities |
|---------|---------------------|
| `ChallengeService` | CRUD challenges, file storage, admin stats |
| `DockerService` | Docker image build/run/stop, port allocation, container lifecycle |
| `EnvironmentService` | Per-user instance management, flag generation, port allocation |
| `FlagService` | Static + dynamic flag validation, solve tracking, duplicate prevention |
| `SolveService` | Solve recording, leaderboard, statistics |
| `HintService` | Hint reveal with time-lock (60s cooldown), penalty calculation |
| `CategoryService` | Category CRUD, database-backed (not Confluence) |
| `UserService` | User CRUD, username normalization, login tracking |
| `FileService` | File upload/download from classpath |
| `ChallengeFileStorageService` | Filesystem operations for challenge Dockerfiles |
| `CourseService` | Course/module/lesson retrieval |
| `EnvironmentCleanupService` | Scheduled cleanup of expired instances (60s interval) |
| `LdapAuthenticationService` | JNDI-based LDAP auth against FH Technikum server |

---

## Security Architecture

### Authentication Flow
1. User submits credentials to `POST /api/login`
2. Backend authenticates via LDAP JNDI bind (not Spring Security LDAP)
3. JWT token generated with `sub` (username) and `isAdmin` claims
4. Token stored in HTTP-only cookie (`auth_token`), 24h expiry
5. `JwtAuthenticationFilter` extracts and validates JWT on each request
6. Rate limiting via Bucket4j: 100 req/min global, 10 req/min login, 30 req/min flag

### JWT Token
```json
{ "sub": "username", "isAdmin": false, "iat": 1234567890, "exp": 1234567890 }
```

### CORS
Allowed origins: `localhost:3000`, `127.0.0.1:3000`, `localhost:3002`, production domain

### Rate Limiting
- Global: 100 requests / 60s per user/IP
- Login: 10 requests / 60s
- Flag: 30 requests / 60s
- Health endpoint excluded

---

## Hint System

- Hints stored as JSON array in `challenges.hintsJson`
- Revealed sequentially: 60-second time-lock between hints
- Point penalties: Hint 0 = -10%, Hint 1 = -20%, Hint 2 = -25%
- Tracked in `hint_reveals` table with unique constraint per user/challenge/index
