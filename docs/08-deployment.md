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
| `CTF_SSH_PASSWORD` | app, terminal | SSH password for challenge containers (required; see below) |

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
5. **Deploy Terminal** — Copy `server.js`, `package.json`, and `package-lock.json` to `/opt/ctf/terminal/`, then run `npm ci --omit=dev` on the host (this wipes and reinstalls `node_modules` to exactly match the committed lockfile). The native deploy used to copy only `server.js`, leaving the host's `node_modules` hand-provisioned and stale — a new `require()` in `server.js` then crash-looped the service with `MODULE_NOT_FOUND` (see runbook incident).
6. **Verify `CTF_SSH_PASSWORD`** — Aborts unless both units load `EnvironmentFile=/opt/ctf/ctf.env` and that file contains a non-empty `CTF_SSH_PASSWORD` (both services fail to boot without it). Note: `systemctl show -p Environment` does **not** surface `EnvironmentFile=` variables — the guard checks the `EnvironmentFiles` property plus the file contents directly.
7. **Restart Services** — `systemctl restart ctf-backend ctf-frontend ctf-terminal`
8. **Health Check** — Retry up to 30s: `localhost:3000`, `localhost:3001/health`, `localhost:8080/api/health`

> **`CTF_SSH_PASSWORD` is required in production (fail-fast).** The backend reads
> `ctf.ssh.password=${CTF_SSH_PASSWORD}` (no default) and injects it into every
> challenge container (`-e CTF_SSH_PASSWORD=...` + `docker exec chpasswd`); the
> terminal gateway calls `process.exit(1)` when it is missing.
>
> **Single source of truth (recommended):** point both units at the **same**
> `EnvironmentFile` so the value cannot drift. Do this **once, before** deploying
> the version that requires it:
>
> ```bash
> # 1. Create one root-only secrets file (only copy of the secret)
> sudo mkdir -p /opt/ctf
> echo "CTF_SSH_PASSWORD=$(openssl rand -hex 32)" | sudo tee /opt/ctf/ctf.env > /dev/null
> sudo chown root:root /opt/ctf/ctf.env
> sudo chmod 600 /opt/ctf/ctf.env
>
> # 2. Both units read the same file
> sudo systemctl edit ctf-backend
> #   [Service]
> #   EnvironmentFile=/opt/ctf/ctf.env
> sudo systemctl edit ctf-terminal
> #   [Service]
> #   EnvironmentFile=/opt/ctf/ctf.env
> sudo systemctl daemon-reload
> ```
>
> The deploy workflow **fails fast** unless: (1) both units reference the shared
> `EnvironmentFile=/opt/ctf/ctf.env` (checked via `systemctl show -p EnvironmentFiles`),
> and (2) that file contains a non-empty `CTF_SSH_PASSWORD`. Because both units
> read the same file, the value is structurally identical — no drift is possible.
>
> **Runner prerequisites (self-hosted, non-interactive):** the runner account
> needs passwordless `sudo` for the deploy's commands. Minimal rule for the
> runner user (here `student`):
>
> ```
> student ALL=(root) NOPASSWD: /usr/bin/systemctl restart ctf-*, /usr/bin/systemctl start ctf-*, /usr/bin/systemctl stop ctf-*, /usr/bin/systemctl show ctf-*, /usr/bin/cat /opt/ctf/ctf.env
> ```
>
> The deploy also needs the runner to read `/opt/ctf/ctf.env` (root-only, 600),
> hence the `cat` entry. Verify non-interactively with:
> `sudo -n systemctl show ctf-backend -p EnvironmentFiles --no-pager` and
> `sudo -n cat /opt/ctf/ctf.env` (must print the `CTF_SSH_PASSWORD=` line).

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
    ├── server.js              # Node.js terminal gateway
    ├── package.json           # manifest (copied on every deploy)
    ├── package-lock.json      # pinned deps (copied on every deploy)
    └── node_modules/          # reinstalled via `npm ci --omit=dev` on each deploy
```

---

## Systemd Services

### ctf-backend
```ini
[Service]
Type=simple
User=ctf
Group=ctf
WorkingDirectory=/opt/ctf/backend
ExecStart=/usr/bin/java -jar app.jar
Environment="DOCKER_HOST=unix:///var/run/docker.sock"
Environment="TERMINAL_GATEWAY_URL=http://localhost:3001"
# REQUIRED (no default in application.properties) — shared with ctf-terminal:
EnvironmentFile=/opt/ctf/ctf.env
# logback writes ./logs/ctf-backend.log (from the WorkingDirectory); the dir
# must exist and be owned by the service user or Spring Boot aborts at startup.
# ExecStartPre (note the '+' = run as root, NOT as User=ctf) guarantees the dir
# exists with ctf:ctf ownership on every start, on any systemd version.
ExecStartPre=+/bin/mkdir -p /opt/ctf/backend/logs
ExecStartPre=+/bin/chown ctf:ctf /opt/ctf/backend/logs
Restart=always
```

> **`logs/` directory is a hard startup dependency.** The appender resolves
> `logging.file.name=./logs/ctf-backend.log` against `WorkingDirectory`, and
> logback refuses to run when it cannot create the parent directory. `ctf`
> cannot `mkdir` under `/opt/ctf/backend` (owned `student:student`, mode 755),
> so the unit **must** create it before start — use `ExecStartPre` with the `+`
> prefix (runs as root, not `User=ctf`); `LogsDirectory=` with an absolute path
> is silently ignored on systemd < 246 (see the durable fix below). One-time
> manual repair:
>
> ```bash
> sudo mkdir -p /opt/ctf/backend/logs
> sudo chown ctf:ctf /opt/ctf/backend/logs
> sudo systemctl reset-failed ctf-backend
> sudo systemctl restart ctf-backend
> ```
>
> **Durable fix — create it on every startup.** One-time `mkdir` works until the
> tree is replaced or wiped. Use `ExecStartPre` with the `+` prefix (runs as
> root, NOT as the unit's `User=ctf`, so it can `mkdir` under the
> `student`-owned tree). **Replace the `[Service]` block contents — remove any
> stale `LogsDirectory=` line from earlier attempts:**
>
> ```bash
> sudo systemctl edit ctf-backend
> #   [Service]
> #   ExecStartPre=+/bin/mkdir -p /opt/ctf/backend/logs
> #   ExecStartPre=+/bin/chown ctf:ctf /opt/ctf/backend/logs
> sudo systemctl daemon-reload
> sudo systemctl reset-failed ctf-backend
> sudo systemctl restart ctf-backend
> ```
>
> > **`LogsDirectory=` is NOT reliable here.** It only supports absolute paths on
> > systemd ≥ 246 (e.g. Ubuntu ≥ 20.10, Debian ≥ 11). On older systemd the
> > directive is silently ignored — the unit still starts and then crashes in
> > logback exactly as observed. Prefer `ExecStartPre` above; it works on every
> > systemd. (If `systemd --version` on the host reports ≥ 246, `LogsDirectory=`
> > also works.)
>
> Verify: `curl -sf http://localhost:8080/api/health` after ~20–30s (Spring Boot
> startup) should return `OK`; `ls -ld /opt/ctf/backend/logs` should show
> `ctf:ctf`.

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
# REQUIRED (server.js exits with FATAL if missing) — shared with ctf-backend:
EnvironmentFile=/opt/ctf/ctf.env
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
