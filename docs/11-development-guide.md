# Development Guide

---

## Prerequisites

| Tool | Version |
|------|---------|
| Java | 21 (Temurin recommended) |
| Node.js | 20 |
| Maven | 3.9+ (wrapper included) |
| Docker & Docker Compose | Latest |
| PostgreSQL | 16 (optional for native dev) |

## Local Setup (Native)

### 1. Clone and configure

```bash
git clone <repo-url>
cd InnoLab-Project
cp .env.example .env   # if exists, or create manually
```

### 2. Start a PostgreSQL instance (Docker)

```bash
docker run -d --name ctf-db -e POSTGRES_USER=ctfuser -e POSTGRES_PASSWORD=ctfpass -e POSTGRES_DB=ctf -p 5432:5432 postgres:16
```

### 3. Start the backend

```bash
cd ctf-backend
./mvnw spring-boot:run
# or: ./mvnw clean package -DskipTests && java -jar target/app.jar
```

Backend starts on `http://localhost:8080`.

### 4. Start the terminal gateway

```bash
cd ctf-terminal
npm install --production
node server.js
```

Terminal starts on `http://localhost:3001`.

### 5. Start the frontend

```bash
cd ctf-frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:3000`.

## Local Setup (Docker)

```bash
docker compose build
docker compose up -d
```

All services start inside Docker. Frontend: `:3000`, Backend: `:8080`, Terminal: `:3001`.

## Running Tests

### Backend

```bash
cd ctf-backend
./mvnw test
```

### Frontend

```bash
cd ctf-frontend
npm test                # CLI mode
npm run test:ui         # Vitest UI browser mode
```

## Adding a New Challenge

### Static Challenge (no container)

Use the admin dashboard (`/admin`) — fill in title, description, category, difficulty, points, flag, optionally upload a ZIP file.

### Dynamic Challenge (instance-based)

1. Create challenge directory:
   ```
   challenges/<challengeId>/
   ├── docker/
   │   ├── Dockerfile
   │   ├── entrypoint.sh
   │   └── (any other challenge files)
   └── files/
       └── (downloadable attachments)
   ```

2. **Dockerfile** template:
   ```dockerfile
   FROM alpine:latest
   RUN apk add --no-cache openssh-server bash
   RUN adduser -D -s /bin/bash ctfuser && \
       echo "ctfuser:ctfpassword" | chpasswd
   RUN sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
   EXPOSE 22
   COPY entrypoint.sh /entrypoint.sh
   RUN chmod +x /entrypoint.sh
   ENTRYPOINT ["/entrypoint.sh"]
   ```

3. **entrypoint.sh** template:
   ```bash
   #!/bin/sh
   set -e
   ssh-keygen -A
   if [ -n "$FLAG" ]; then
       echo "$FLAG" > /flag.txt
       chown ctfuser:ctfuser /flag.txt
       chmod 600 /flag.txt
   fi
   exec /usr/sbin/sshd -D -e
   ```

4. Use the admin dashboard to create the challenge with `Requires Instance = true`, upload the Docker files.

## Coding Standards

### Backend
- Java 21 features preferred (records, sealed classes, pattern matching)
- Spring Boot conventions (constructor injection, `@Service`, `@Repository`)
- Checkstyle validation runs in CI
- Lombok for boilerplate (`@Data`, `@Builder`, `@Slf4j`)
- SLF4J for logging (no `System.out.println`)

### Frontend
- TypeScript strict mode
- ESLint configuration
- Next.js App Router conventions (server components by default, `'use client'` where needed)
- Tailwind CSS for styling (no CSS modules unless necessary)
- shadcn/ui component patterns

### Commit Messages

```
feat: add new challenge category
fix: resolve SSH connection timeout
docs: update API documentation
test: add integration tests for flag service
```

## Production Build

### Backend JAR
```bash
cd ctf-backend
./mvnw clean package -DskipTests
```

### Frontend
```bash
cd ctf-frontend
npm ci
npm run build
```

### Docker Images
```bash
docker compose build
```

## Debugging

```bash
# Backend logs
docker compose logs -f app

# Frontend logs
docker compose logs -f frontend

# Terminal logs
docker compose logs -f terminal

# Database access
docker compose exec db psql -U ctfuser -d ctf
```

The application.properties file has debug logging enabled for key components (`at.fhtw.ctfbackend` = DEBUG) — adjust as needed.
