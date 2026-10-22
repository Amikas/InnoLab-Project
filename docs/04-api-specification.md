# API Specification

**Base URL:** `http://localhost:8080` (dev) or `http://inno1-bif3-p1-w25.cs.technikum-wien.at/api` (prod, via nginx)
**Auth:** JWT in HTTP-only cookie (`auth_token`), set by `POST /api/login`
**Content-Type:** `application/json` (unless noted)

---

## Authentication

### POST /api/login
Authenticate with FH LDAP credentials. Sets `auth_token` cookie.

```json
// Request
{ "username": "if24bxxx", "password": "..." }

// Response 200
{ "status": "success", "message": "Welcome, if24bxxx!", "username": "if24bxxx", "isAdmin": false, "email": "...", "displayName": "..." }
```

### POST /api/logout
Clears the auth cookie.

### GET /api/user/me
Returns current authenticated user profile.

```json
// Response 200
{ "username": "if24bxxx", "isAdmin": false, "isActive": true, "id": 1, "email": "...", "displayName": "...", "createdAt": "...", "lastLoginAt": "..." }
```

### GET /api/auth/me
Alias for `/api/user/me`.

### GET /api/auth/admin-check
Returns admin status and active flag.

---

## Challenges

### GET /api/challenges
List all challenges.

```json
// Response 200
[{ "id": "web-101-1234567890", "title": "Basic Web Exploit", "description": "...", "category": "web-exploitation", "difficulty": "easy", "points": 100, "downloadUrl": ".../download", "originalFilename": "web-101.zip", "requiresInstance": false, "hints": ["Check HTML source"] }]
```

### GET /api/challenges/{id}
Get single challenge detail.

### GET /api/challenges/{id}/download
Download challenge attachment file (binary).

### POST /api/challenges (Admin)
Create challenge. `multipart/form-data`.

| Field | Type | Required |
|-------|------|----------|
| `title` | string | yes |
| `description` | string | yes |
| `category` | string | yes |
| `difficulty` | string | yes (easy/medium/hard) |
| `points` | integer | yes |
| `flag` | string | no (static flag) |
| `downloadFile` | file | no |
| `requiresInstance` | boolean | no (default: false) |
| `dockerFiles` | file[] | no |
| `hints` | string[] | no |

### PUT /api/challenges/{id} (Admin)
Update challenge. Same fields as create, all optional.

### DELETE /api/challenges/{id} (Admin)
Delete challenge. Returns 204.

### GET /api/challenges/admin/stats (Admin)
Admin statistics.

---

## Categories

### GET /api/categories
List all categories.

```json
// Response 200
[{ "id": "crypto", "name": "Cryptography", "summary": "<p>HTML content</p>", "fileUrl": "..." }]
```

### POST /api/categories/create
Create category.

---

## Flag Submission

### POST /api/flags/submit
Submit and validate a flag.

```json
// Request
{ "challengeId": "web-101-1234567890", "flag": "FLAG{correct_answer}" }

// Success 200
{ "message": "Correct flag!", "status": "success", "solveCount": 42, "pointsEarned": 100 }

// Error 400
{ "message": "Incorrect flag.", "status": "error" }
// or
{ "message": "Flag already submitted.", "status": "warning" }
```

Creates a solve record and automatically cleans up running Docker instances.

---

## Solves / Scoreboard

| Endpoint | Description |
|----------|-------------|
| `GET /api/solves/me` | Current user's solves |
| `GET /api/solves/check/{challengeId}` | `{ "solved": true/false }` |
| `GET /api/solves/challenge/{challengeId}` | All solvers for challenge |
| `GET /api/solves/challenge/{challengeId}/count` | `{ "count": 42 }` |
| `GET /api/solves/challenge/{challengeId}/stats` | Full statistics |
| `GET /api/solves/recent?limit=10` | Recent solves (activity feed) |
| `GET /api/solves/top-solvers?limit=10` | Leaderboard: `{ "username": count }` |
| `GET /api/solves/most-solved?limit=10` | Most solved challenges |
| `GET /api/solves/category/{category}` | Filter by category |
| `GET /api/solves/difficulty/{difficulty}` | Filter by difficulty |
| `GET /api/solves/time-range?start=ISO&end=ISO` | Filter by time range |
| `GET /api/solves/me/stats` | Current user's statistics |
| `GET /api/solves/user/{username}/stats` | User statistics by username |
| `GET /api/solves/total-count` | `{ "totalCount": 1234 }` |

---

## Environments (Challenge Instances)

### POST /api/environment/build/{challengeId}
Build Docker image and start challenge instance.

### POST /api/environment/start/{challengeId}
Start existing challenge instance (if image already built).

```json
// Response 200
{ "instanceId": "uuid", "username": "if24bxxx", "challengeId": "web-101-...", "containerName": "ctf-abc123", "flagHash": "...", "sshPort": 30123, "status": "RUNNING", "createdAt": "...", "expiresAt": "..." }
```

### GET /api/environment/instance/{instanceId}
Get instance status and details.

### POST /api/environment/stop/{instanceId}
Stop and clean up challenge instance.

---

## Hints

### POST /api/hints/reveal
```json
// Request
{ "challengeId": "web-101-...", "hintIndex": 0 }

// Success 200 — hint revealed
{ "message": "Hint revealed!", "hint": "Check the HTTP headers", "penaltyPercent": 10 }

// Locked 423 — still on cooldown
{ "message": "LOCKED_UNTIL:1712345678", "hint": null }
```

### GET /api/hints/status/{challengeId}
Get hint reveal status: which hints are revealed, when next unlocks.

---

## Courses

Both endpoints require an authenticated session (`auth_token` cookie). Anonymous requests return `401`; there is no public course API.

### GET /api/courses
List published courses.

### GET /api/courses/{slug}
Get course by slug with modules and lessons.

---

## Files

### GET /api/files/download/{filename}
Download file from `/app/files` directory.

### POST /api/files/upload
Upload file.

---

## Admin

### Users (`/api/admin/users`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users |
| GET | `/{id}` | Get user by ID |
| PATCH | `/{id}` | Update user fields |
| GET | `/admins` | List admin usernames |
| PUT | `/{username}` | Add admin role |
| DELETE | `/{username}` | Remove admin role |

### Courses (`/api/admin/courses`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all courses |
| GET | `/{id}` | Get course by ID |
| POST | `/` | Create course |
| PUT | `/{id}` | Update course |
| DELETE | `/{id}` | Delete course |
| PUT | `/{id}/publish` | Set published status |

### Modules (`/api/admin/modules`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all modules |
| GET | `/{id}` | Get module by ID |
| POST | `/` | Create module |
| PUT | `/{id}` | Update module |
| DELETE | `/{id}` | Delete module |
| GET | `/course/{courseId}` | Modules for course |

### Lessons (`/api/admin/lessons`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all lessons |
| GET | `/{id}` | Get lesson by ID |
| POST | `/` | Create lesson |
| PUT | `/{id}` | Update lesson |
| DELETE | `/{id}` | Delete lesson |
| GET | `/module/{moduleId}` | Lessons for module |
| PUT | `/{id}/challenges` | Update challenge IDs |

---

## Health

### GET /api/health
Returns `"OK"` with HTTP 200. No authentication required.

---

## Error Responses

The `GlobalExceptionHandler` returns standardised error envelopes:

| Status | Condition | Response |
|--------|-----------|----------|
| 400 | Bad request / wrong flag | `{ "status": "error", "message": "..." }` |
| 401 | Unauthenticated | `{ "status": "error", "message": "..." }` |
| 403 | Forbidden (not admin) | `{ "status": "error", "message": "Access denied" }` |
| 404 | Resource not found | `{ "status": "error", "message": "Resource not found" }` |
| 423 | Hint locked | `{ "message": "LOCKED_UNTIL:<epoch>" }` |
| 429 | Rate limited | `Retry-After` and `X-RateLimit-Remaining` headers |
| 500 | Server error | `{ "error": "...", "details": "..." }` |
