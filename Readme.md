# InnoLab CTF Platform

A Capture-the-Flag (CTF) training platform for **FH Technikum Wien** students. Users practice cybersecurity skills through categorized challenges with varying difficulties — including per-user isolated Docker containers with real-time WebSocket terminal access.

---

## Tech Stack

### Backend (`ctf-backend/`)

| Technology | Version | Purpose |
|---|---|---|
| Java | 21 | Core language |
| Spring Boot | 3.4.4 | Application framework |
| Spring Security | — | Authentication & authorization |
| Spring Data JPA | — | ORM (Hibernate) |
| PostgreSQL | 16 | Production database |
| H2 | — | Test database |
| JWT (jjwt) | 0.11.5 | Token-based auth |
| Lombok | 1.18.38 | Boilerplate reduction |
| Bucket4j | 8.10.1 | Rate limiting |
| Testcontainers | — | Integration test containers |
| Maven | 3.9.6 | Build tool |

### Frontend (`ctf-frontend/`)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.4 | React framework (App Router) |
| React | 19.0.1 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4.1.9 | Styling |
| Radix UI | — | Accessible primitives |
| xterm.js | 5.3.0 | Terminal emulation |
| TipTap | 3.22.1 | Rich text editor |
| react-syntax-highlighter | 16.1.1 | Code blocks |
| react-hook-form | 7.66.1 | Form handling |
| zod | 4.1.12 | Schema validation |
| lucide-react | 0.454.0 | Icons |
| jose | 6.2.3 | JWT (client-side) |
| bcryptjs | 3.0.3 | Password hashing |
| Vitest | 4.0.6 | Testing |

### Terminal Gateway (`ctf-terminal/`)

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 4.18.2 | HTTP server |
| ws | 8.14.2 | WebSocket library |
| ssh2 | 1.14.0 | SSH client |

---

## Quick Start (Docker)

```bash
git clone <repo-url>
cd InnoLab-Project

docker compose up -d
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Terminal WS | ws://localhost:3001 |

## Native Development

```bash
# Backend
cd ctf-backend
./mvnw spring-boot:run          # or: ./mvnw clean package -DskipTests && java -jar target/app.jar

# Frontend
cd ctf-frontend
npm install
npm run dev

# Terminal Gateway
cd ctf-terminal
npm install --production
node server.js
```

## Project Structure

| Directory | Description |
|---|---|
| `ctf-backend/` | Spring Boot REST API — challenge CRUD, auth, Docker management, scoring |
| `ctf-frontend/` | Next.js App Router — challenge browser, terminal, admin dashboard, courses |
| `ctf-terminal/` | Node.js WebSocket ↔ SSH proxy for challenge containers |
| `challenges/` | CTF challenge Dockerfile definitions |
| `docs/` | Architecture, API, deployment, and operational documentation |

## Documentation

See [docs/README.md](docs/README.md) for the full documentation index.

---

**FH Technikum Wien — InnoLab Program**
