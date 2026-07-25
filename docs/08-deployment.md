# Deployment

---

## Docker Compose (Local Development)

```bash
# Build and start all services
docker compose build
docker compose up -d
```

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `frontend` | ctf-frontend | 3000 | Next.js UI |
| `app` | ctf-backend | 8080 | Spring Boot API |
| `db` | postgres:16 | 5432 | PostgreSQL |
| `terminal` | ctf-terminal | 3001 | WebSocket terminal gateway |

### Networks
- Name: `ctf-network` (bridge, created automatically by Compose)

### Volumes
- `pgdata` — PostgreSQL data
- `challenges_data` — Challenge files
- Docker socket mounted at `/var/run/docker.sock` (app service)

### Key Environment Variables

| Variable | Service | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | app | Token signing |
| `APP_CORS_ALLOWED_ORIGINS` | app | CORS origins |
| `TERMINAL_GATEWAY_URL` | app | Backend → terminal comms |
| `TERMINAL_WS_URL` | app, frontend | Frontend → terminal WS |
| `DOCKER_HOST` | app | Docker socket path |
| `NEXT_PUBLIC_API_URL` | frontend | Frontend → backend API |
| `API_PROXY_TARGET` | frontend | Next.js proxy target |
| `POSTGRES_USER/PASS/DB` | db | Database credentials |

---

## Production (Native, GitHub Actions)

### Deploy Workflow (`.github/workflows/deploy.yml`)

Triggered on push to `master`/`main`, runs on self-hosted runner.

```yaml
env:
  NEXT_PUBLIC_API_URL: ""
  NEXT_PUBLIC_TERMINAL_URL: ws://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
  DEPLOY_DIR: /opt/ctf
```

**Steps:**
1. **Build Backend** — `./mvnw clean package -DskipTests -Dcheckstyle.skip=true -q`
2. **Build Frontend** — `npm ci && npm run build` (with `NEXT_PUBLIC_*` vars)
3. **Deploy Backend** — Copy JAR to `/opt/ctf/backend/app.jar`
4. **Deploy Frontend** — Remove `/opt/ctf/frontend/.next`, copy new `.next`, copy static assets
5. **Deploy Terminal** — Copy `server.js` to `/opt/ctf/terminal/server.js`
6. **Restart Services** — `systemctl restart ctf-backend ctf-frontend ctf-terminal`
7. **Health Check** — Retry up to 30s: `localhost:3000`, `localhost:3001/health`, `localhost:8080/api/health`

### CI Pipeline (`.github/workflows/ci.yml`)

Triggered on push/PR to `main`/`master`/`dev`.

| Job | Description |
|-----|-------------|
| `security-scans` | TruffleHog secret detection + OWASP Dependency Check |
| `frontend` | Node 20, `npm ci`, `npm audit`, ESLint, Vitest + coverage |
| `backend` | Java 21, Maven Checkstyle, tests, JAR build |
| `integration-tests` | PostgreSQL 16 service, integration tests (currently skipped) |
| `docker` | Build & push to Docker Hub (`aminkasmi06/ctf*`), Trivy scan (main/master only) |
| `notify` | Slack notification on failure |

### Production File Layout

```
/opt/ctf/
├── backend/
│   ├── app.jar              # Spring Boot executable
│   └── challenges/          # Challenge Dockerfiles (owned ctf:ctf)
├── frontend/
│   └── .next/               # Next.js standalone build (owned student:student)
│       └── standalone/
│           └── server.js
└── terminal/
    └── server.js             # Node.js terminal gateway
```

---

## Systemd Services

### ctf-backend
```ini
[Service]
Type=simple
User=ctf
WorkingDirectory=/opt/ctf/backend
ExecStart=/usr/bin/java -jar app.jar
Environment="DOCKER_HOST=unix:///var/run/docker.sock"
Environment="TERMINAL_GATEWAY_URL=http://localhost:3001"
Restart=always
```

### ctf-frontend
```ini
[Service]
User=student
Group=student
WorkingDirectory=/opt/ctf/frontend/.next/standalone
ExecStart=/usr/bin/node /opt/ctf/frontend/.next/standalone/server.js
Environment="PORT=3000"
```

### ctf-terminal
```ini
[Service]
Type=simple
ExecStart=/usr/bin/node /opt/ctf/terminal/server.js
Restart=always
```

---

## Nginx Configuration

Production reverse proxy (port 80 only, no HTTPS yet):

```nginx
server {
    listen 80;
    server_name inno1-bif3-p1-w25.cs.technikum-wien.at;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Origin $http_origin;
    }

    location /terminal/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

---

## Important Deployment Contracts

| Path | Owner | Requirement |
|------|-------|-------------|
| `/opt/ctf/frontend/.next` | `student:student` | Runner must replace; Next.js must not create root-owned files |
| `ctf-frontend` systemd | `student:student` | Keeps runtime-generated files deployable |
| `/opt/ctf/backend/challenges` | group `ctf`, setgid | Backend service must traverse/read/write challenge folders |
| `ctf-backend` systemd | `ctf` | Must have Docker socket + challenge storage access |

---

## See Also

- [Operations Runbook](07-operations-runbook.md) — full production details, incident records, troubleshooting
