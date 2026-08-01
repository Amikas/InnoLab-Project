# CTF Platform Production Operations Runbook

**System:** InnoLab / CTF Training Platform  
**Production host:** `inno1-bif3-p1-w25.cs.technikum-wien.at`  
**Document status:** Working operational record based on investigation completed on 2026-05-25  
**Purpose:** Capture the deployed architecture, runtime dependencies, incident diagnoses, fixes applied, verification steps, and recommended hardening so future troubleshooting is systematic rather than ad hoc.

---

## 1. Executive Summary

The platform consists of:

- A **Next.js frontend** exposed through nginx.
- A **Spring Boot backend** responsible for challenge metadata, authentication, dynamic challenge instances, Docker image/container execution, and instance state.
- A **Node.js terminal gateway** that accepts browser WebSocket connections and opens SSH sessions into running challenge containers.
- **nginx** as the public reverse proxy.
- **systemd** services controlling backend, frontend, and terminal gateway.
- **Docker** used by the backend to create per-user challenge containers.

Three production issues were diagnosed and addressed:

| Incident | Symptom | Confirmed Root Cause | Resolution |
|---|---|---|---|
| Environment would not start | `POST /api/environment/build/<id>` returned HTTP 500 | Backend runs as `ctf`, but challenge files were under directories owned `student:student` with mode `770`, preventing `ctf` access | Changed challenge directory group to `ctf`, granted group access, enabled setgid inheritance |
| Terminal failed after environment start | Browser attempted `wss://.../terminal` and showed connection refused | nginx is listening on HTTP port `80` only; nothing listens on HTTPS/WSS port `443` | Changed frontend build-time terminal URL from `wss://...` to `ws://...` |
| Deployment failed updating frontend | GitHub Action failed removing files under `/opt/ctf/frontend/.next` with `Permission denied` | Frontend systemd process ran as root and generated root-owned Next.js output inside a tree otherwise managed by the deployment user | Set `ctf-frontend` systemd service to run as `student:student`, repaired ownership once, reran deployment |

The platform was verified working after these changes: an environment container successfully started, the terminal WebSocket connected through nginx, and the frontend is serving successfully under `student:student`.

---

## 2. Production Architecture

### 2.1 Runtime request flow

```text
Browser
  |
  | HTTP :80
  v
nginx
  |-- /              -> Next.js frontend on 127.0.0.1:3000
  |-- /api/          -> Spring Boot backend on 127.0.0.1:8080
  `-- /terminal/     -> Node.js WebSocket/SSH gateway on 127.0.0.1:3001
                                      |
                                      | SSH via mapped host port or container target
                                      v
                             Per-user Docker challenge container
```

### 2.2 Observed listening ports

At the time of investigation:

```text
Port 80    nginx public HTTP entry point
Port 3000  Next.js frontend
Port 3001  Node terminal gateway
Port 8080  Spring Boot backend
Port 443   not listening
```

**Operational consequence:** The current public deployment supports `http://` and `ws://`, not `https://` and `wss://`.

### 2.3 nginx configuration observed

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

The `/terminal/` proxy was tested successfully with a WebSocket upgrade over HTTP, returning `HTTP/1.1 101 Switching Protocols`.

---

## 3. systemd Service Model

### 3.1 Backend service

Observed effective configuration:

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

Additional database/JWT/CORS environment values exist in the actual unit and must be treated as secrets or configuration-sensitive data.

**Key filesystem implication:** Because the backend working directory is `/opt/ctf/backend` and no `challenges.base.path` override was observed in the unit file, the default application path `./challenges` resolves to:

```text
/opt/ctf/backend/challenges
```

### 3.2 Frontend service

Base unit and override are combined by systemd. The significant effective configuration after remediation is:

```ini
[Service]
User=student
Group=student
ExecStart=/usr/bin/node /opt/ctf/frontend/.next/standalone/server.js
WorkingDirectory=/opt/ctf/frontend/.next/standalone
Environment="PORT=3000"
```

The service was tested after this change:

```text
Active: active (running)
HTTP/1.1 200 OK from http://localhost:3000
User=student
Group=student
```

### 3.3 Terminal gateway service

Observed operational facts:

```text
Service: ctf-terminal
Process: /usr/bin/node server.js
Listening: 0.0.0.0:3001
Health endpoint: http://localhost:3001/health -> 200 OK
```

The terminal gateway accepts WebSocket connections and then opens SSH sessions to challenge containers.

---

## 4. Deployment Workflow

### 4.1 Current GitHub Actions deployment approach

The workflow is triggered on pushes to `master` or `main` and executes on a self-hosted runner.

Relevant environment configuration after terminal remediation:

```yaml
env:
  NEXT_PUBLIC_API_URL: ""
  NEXT_PUBLIC_TERMINAL_URL: ws://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
  DEPLOY_DIR: /opt/ctf
```

High-level deployment sequence:

```yaml
- Build Backend:
    ./mvnw clean package -DskipTests -Dcheckstyle.skip=true -q

- Build Frontend:
    npm ci
    npm run build

- Deploy Backend:
    copy built JAR to /opt/ctf/backend/app.jar

- Deploy Frontend:
    remove /opt/ctf/frontend/.next
    copy fresh ctf-frontend/.next to /opt/ctf/frontend/.next
    copy static assets into standalone tree

- Deploy Terminal:
    copy server.js + package.json + package-lock.json to /opt/ctf/terminal/
    npm ci --omit=dev   # reinstalls node_modules to match the committed lockfile

- Restart Services:
    systemctl restart ctf-backend ctf-frontend ctf-terminal

- Health Check:
    localhost:3000, localhost:3001/health, localhost:8080/api/health
```

### 4.2 Important deployment contracts

The current deployment model relies on these contracts:

| Path / Service | Owner or Execution User | Requirement |
|---|---|---|
| `/opt/ctf/frontend/.next` | `student:student` | Runner must be able to replace it; Next.js must not recreate root-owned files |
| `ctf-frontend` service | `student:student` | Keeps runtime-generated frontend files deployable by the runner |
| `/opt/ctf/backend/challenges` | group `ctf`, setgid enabled | Backend service must be able to traverse/read/write challenge folders |
| `ctf-backend` service | `ctf` | Must have Docker access and challenge storage access |
| `/opt/ctf/terminal/node_modules` | runner user (e.g. `student`) | The deploy runs `npm ci --omit=dev` as the runner without sudo; the directory must stay writable by it. If a manual `sudo npm ci` was ever run, repair with `sudo chown -R student:student /opt/ctf/terminal` |

### 4.3 Why `NEXT_PUBLIC_TERMINAL_URL` matters

`NEXT_PUBLIC_*` variables are embedded into the browser-facing JavaScript bundle at frontend build time. Changing only a systemd environment variable after the frontend has been built does not change the URL used by users' browsers.

Current valid value for the existing HTTP-only deployment:

```yaml
NEXT_PUBLIC_TERMINAL_URL: ws://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
```

Future value once HTTPS/TLS is enabled in nginx:

```yaml
NEXT_PUBLIC_TERMINAL_URL: wss://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
```

---

## 5. Challenge Creation and Runtime Lifecycle

### 5.1 Challenge storage

The backend uses the property:

```properties
challenges.base.path=./challenges
```

unless overridden.

`ChallengeFileStorageService` performs the following:

- Creates a challenge directory.
- Creates subdirectories:
  - `docker/`
  - `files/`
- Saves uploaded Docker-related files under `docker/`.
- Saves downloadable challenge assets under `files/`.

With the current backend working directory, a dynamically created challenge is expected at:

```text
/opt/ctf/backend/challenges/<challengeId>/
├── docker/
│   ├── Dockerfile
│   ├── app.py            # example; depends on challenge
│   └── entrypoint.sh     # example; depends on challenge
└── files/
```

### 5.2 Challenge instance start sequence

When a user clicks **Start Environment**, the frontend calls:

```http
POST /api/environment/build/{challengeId}
```

The backend performs this sequence:

1. Resolve the authenticated user.
2. Return an already-running instance if one exists.
3. Verify the challenge exists in the database.
4. Generate a dynamic flag and store its hash.
5. Allocate an SSH port from the range beginning at `30000`.
6. Create an instance database record.
7. Ask `DockerService` to build and run the challenge.
8. Return instance metadata including:
   - `instanceId`
   - `containerName`
   - `sshPort`
   - `status`
   - expiry information

### 5.3 Docker build/run behavior

`DockerService`:

- Locates the Dockerfile in one of:
  - `<challenge>/docker/Dockerfile`
  - `<challenge>/docker/dockerfile`
  - `<challenge>/Dockerfile`
  - `<challenge>/dockerfile`
- Creates a minimal Dockerfile if the challenge directory exists but a Dockerfile is absent.
- Builds or reuses an image named approximately:
  - `ctf-<challengeId>`
- Starts a container using:
  - `--network ctf-network`
  - `-e FLAG=<generated flag>`
  - `-p <allocatedSSHPort>:22`
  - `--memory=512m`
  - `--cpus=1.0`
  - `--tmpfs=/tmp:rw,noexec,nosuid,size=100m`

### 5.4 Terminal connection sequence

The frontend terminal component connects to:

```text
ws://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal/
  ?instanceId=<instance-id>
  &containerName=<container-name>
  &sshPort=<ssh-port>
```

The terminal gateway requires `containerName`; if omitted it sends:

```text
Error: No container name specified
```

The gateway then:

1. Uses `127.0.0.1:<sshPort>` when `sshPort` is supplied.
2. Waits for SSH to become reachable.
3. Connects with `ssh2`.
4. Bridges browser WebSocket input/output to the SSH shell.

---

## 6. Incident Record: Environment Start Returned HTTP 500

### 6.1 Symptom

Browser showed:

```text
Failed to start environment: HTTP error! status: 500
```

Request:

```http
POST /api/environment/build/dfdyf-1775815545773
```

### 6.2 Initial uncertainty

The backend controller returned only a generic message when lower-layer exceptions were wrapped:

```java
return ResponseEntity.status(500).body(Map.of(
    "error", "Failed to build and start challenge",
    "details", e.getMessage()
));
```

This obscured whether the failure involved:

- missing challenge directory,
- inaccessible files,
- Docker build failure,
- Docker permissions,
- port allocation,
- or Docker container startup.

### 6.3 Confirmed root cause

The backend service runs as:

```text
User=ctf
WorkingDirectory=/opt/ctf/backend
```

Permission inspection showed:

```text
/opt/ctf/backend/challenges                       student:student  drwxrwx---
/opt/ctf/backend/challenges/dfdyf-1775815545773   student:student  drwxrwx---
```

The mode `770` permitted only owner `student` and group `student` to traverse/read the directories. The backend user `ctf` therefore could not access the challenge build context.

### 6.4 Remediation applied

```bash
sudo chgrp -R ctf /opt/ctf/backend/challenges
sudo chmod -R g+rwX /opt/ctf/backend/challenges
sudo chgrp ctf /opt/ctf/backend/challenges
sudo chmod g+s /opt/ctf/backend/challenges
```

Resulting parent permission:

```text
drwxrws--- student ctf challenges
```

The setgid bit on the parent (`g+s`) ensures child directories created beneath it inherit group `ctf`.

### 6.5 Verification

After remediation, backend logs confirmed:

```text
Found Dockerfile at: /opt/ctf/backend/challenges/dfdyf-1775815545773/docker/Dockerfile
Using cached image: ctf-dfdyf-1775815545773
Running container: ctf-9c3f61bf
Ports: SSH=30027
Container started successfully!
Container status: running
```

**Conclusion:** The environment-build HTTP 500 was caused by challenge storage directory permissions.

---

## 7. Incident Record: Terminal WebSocket Connection Refused

### 7.1 Symptom

After the Docker instance successfully started, the browser terminal attempted to connect to:

```text
wss://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal/
```

and reported connection refused.

### 7.2 Diagnosis

Socket inspection showed:

```text
nginx      listening on port 80
frontend   listening on port 3000
terminal   listening on port 3001
backend    listening on port 8080
no process listening on port 443
```

nginx configuration also showed only:

```nginx
listen 80;
```

Therefore, `wss://` failed because secure WebSocket connections require a reachable TLS/HTTPS listener, normally on port `443`.

### 7.3 Remediation applied

The frontend build setting in the GitHub Actions deployment workflow was changed from:

```yaml
NEXT_PUBLIC_TERMINAL_URL: wss://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
```

to:

```yaml
NEXT_PUBLIC_TERMINAL_URL: ws://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
```

The frontend was rebuilt and redeployed.

### 7.4 Verification

A WebSocket upgrade through nginx over HTTP returned:

```text
HTTP/1.1 101 Switching Protocols
```

The deployed frontend bundle was inspected and confirmed to construct a URL containing:

```text
ws://.../terminal/?instanceId=...&containerName=...&sshPort=...
```

**Conclusion:** Terminal connectivity is operational for the current HTTP-only deployment.

### 7.5 Security limitation

`ws://` is unencrypted. This is a functional fix, not the preferred long-term production architecture. The platform should ultimately be served via HTTPS and terminal WebSockets via `wss://`.

---

## 8. Incident Record: Frontend Deployment Permission Failure

### 8.1 Symptom

GitHub Actions failed at:

```bash
rm -rf /opt/ctf/frontend/.next
```

with messages similar to:

```text
rm: cannot remove '.../.next/.../1.html': Permission denied
```

### 8.2 Diagnosis

Filesystem inspection showed mixed ownership inside the deployed Next.js tree:

```text
most frontend deployment directories: student:student
some generated lesson page files:     root:root
```

The frontend systemd unit did not specify `User=`, so it ran as root. The Next.js process created/generated files under the deployed `.next` directory as root. The GitHub Actions runner, operating as `student`, could not delete these files during the next release.

### 8.3 Safe pre-change test

Before changing the production unit, a second Next.js instance was started as `student` on port `3100`:

```bash
sudo -u student sh -lc '
cd /opt/ctf/frontend/.next/standalone &&
PORT=3100 /usr/bin/node server.js > /tmp/ctf-frontend-student-test.log 2>&1 &
echo $! > /tmp/ctf-frontend-student-test.pid
'
curl -i http://127.0.0.1:3100/
```

Result:

```text
HTTP/1.1 200 OK
Next.js ready
```

This validated that the frontend can run without root privileges.

### 8.4 Permanent remediation applied

The systemd drop-in for `ctf-frontend` was edited to include:

```ini
[Service]
User=student
Group=student
ExecStart=
ExecStart=/usr/bin/node /opt/ctf/frontend/.next/standalone/server.js
WorkingDirectory=/opt/ctf/frontend/.next/standalone
Environment="PORT=3000"
```

Existing ownership was repaired once:

```bash
sudo chown -R student:student /opt/ctf/frontend
sudo systemctl daemon-reload
```

A failed deployment had already partially deleted `.next`, including `standalone/server.js`, so the deployment job was rerun to restore the built frontend output. The service was then restarted successfully by deployment.

### 8.5 Verification

After successful deployment:

```text
ctf-frontend active (running)
HTTP/1.1 200 OK from http://localhost:3000
User=student
Group=student
```

Runtime ownership verification returned no root-owned files:

```bash
find /opt/ctf/frontend/.next -user root -printf '%u:%g %p\n' | head -20
```

Output:

```text
<empty>
```

**Conclusion:** The frontend deployment permission issue is resolved under the current deployment-user model.

---

## 9. Current Permission and Ownership Requirements

### 9.1 Challenge storage

Required condition:

```bash
namei -l /opt/ctf/backend/challenges
```

Expected significant line:

```text
drwxrws--- student ctf challenges
```

The backend (`ctf`) needs access to:

```text
/opt/ctf/backend/challenges/<challengeId>/docker/
```

Quick validation:

```bash
sudo -u ctf ls -la /opt/ctf/backend/challenges/<challengeId>/docker
```

For manually introduced challenge content, reapply group permissions if needed:

```bash
sudo chgrp -R ctf /opt/ctf/backend/challenges
sudo chmod -R g+rwX /opt/ctf/backend/challenges
sudo chmod g+s /opt/ctf/backend/challenges
```

### 9.2 Frontend deployment output

Required condition:

```bash
sudo systemctl show ctf-frontend --property=User --property=Group --no-pager
```

Expected:

```text
User=student
Group=student
```

Validation that runtime output remains deployable:

```bash
find /opt/ctf/frontend/.next -user root -printf '%u:%g %p\n' | head -20
```

Expected:

```text
<empty>
```

---

## 10. Operational Command Reference

### 10.1 Service status

```bash
sudo systemctl status ctf-backend --no-pager -l
sudo systemctl status ctf-frontend --no-pager -l
sudo systemctl status ctf-terminal --no-pager -l
```

### 10.2 Live logs

```bash
sudo journalctl -u ctf-backend -f -n 50 --no-pager
sudo journalctl -u ctf-frontend -f -n 50 --no-pager
sudo journalctl -u ctf-terminal -f -n 50 --no-pager
```

### 10.3 Health checks

```bash
curl -i http://localhost:8080/api/health
curl -I http://localhost:3000
curl -i http://localhost:3001/health
```

### 10.4 nginx configuration and listener checks

```bash
sudo nginx -T
sudo nginx -t
sudo ss -tlnp | grep -E ':(80|443|3000|3001|8080)\b'
```

### 10.5 WebSocket upgrade test through nginx

Supply a live instance's identifiers:

```bash
curl -i --http1.1 --max-time 5 \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "http://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal/?instanceId=<INSTANCE_ID>&containerName=<CONTAINER_NAME>&sshPort=<SSH_PORT>"
```

Expected initial response:

```text
HTTP/1.1 101 Switching Protocols
```

### 10.6 Running challenge containers

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.ID}}'
```

### 10.7 Inspect challenge directory access

```bash
namei -l /opt/ctf/backend/challenges/<CHALLENGE_ID>
sudo -u ctf find /opt/ctf/backend/challenges/<CHALLENGE_ID>/docker -maxdepth 2 -printf '%M %u:%g %p\n'
```

---

## 11. Troubleshooting Playbooks

### 11.1 Start Environment returns HTTP 500

Check in this order:

1. Reproduce while watching backend logs:

   ```bash
   sudo journalctl -u ctf-backend -f -n 50 --no-pager
   ```

2. Confirm challenge directory access:

   ```bash
   namei -l /opt/ctf/backend/challenges/<CHALLENGE_ID>
   sudo -u ctf ls -la /opt/ctf/backend/challenges/<CHALLENGE_ID>/docker
   ```

3. Confirm Dockerfile exists or can be created:

   ```bash
   sudo -u ctf find /opt/ctf/backend/challenges/<CHALLENGE_ID> -maxdepth 3 -type f -print
   ```

4. Confirm Docker access as backend user:

   ```bash
   sudo -u ctf docker ps
   ls -l /var/run/docker.sock
   ```

5. Confirm Docker network:

   ```bash
   docker network inspect ctf-network
   ```

### 11.2 Environment starts but terminal does not connect

Check in this order:

1. Verify terminal gateway health:

   ```bash
   curl -i http://localhost:3001/health
   ```

2. Verify browser URL protocol:
   - Current HTTP-only deployment requires `ws://`, not `wss://`.

3. Verify nginx WebSocket upgrade path:

   ```bash
   curl -i --http1.1 --max-time 5 \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     "http://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal/?instanceId=<ID>&containerName=<NAME>&sshPort=<PORT>"
   ```

4. Verify frontend bundle contains the correct WebSocket URL:

   ```bash
   grep -R "containerName" /opt/ctf/frontend/.next/static /opt/ctf/frontend/.next/standalone/.next/static 2>/dev/null | head -20
   ```

### 11.3 Terminal crash-loops with `MODULE_NOT_FOUND`

Symptom — `journalctl -u ctf-terminal` repeats:

```text
Error: Cannot find module 'dotenv'
... restart counter is at 4 ...
Start request repeated too quickly.
Failed to start ctf-terminal.service
```

Likely root causes, in order:

1. **Stale `node_modules` / stale manifest** — the deployed `server.js` requires a
   module that the host's installed packages do not provide. The native deploy
   now copies `package.json` + `package-lock.json` and runs `npm ci --omit=dev`
   on every deploy, so this should only recur if a manual install diverged.
2. **`CTF_SSH_PASSWORD` missing** — `server.js` exits with `FATAL` if the
   variable is absent (see `systemctl show ctf-terminal -p EnvironmentFiles`).
3. **Port 3001 already in use** — `EADDRINUSE` crash loop.

Fix on the host:

```bash
# Ensure the manifest matches the repo, then reinstall exactly the pinned deps
sudo cp <repo>/ctf-terminal/package.json <repo>/ctf-terminal/package-lock.json /opt/ctf/terminal/
cd /opt/ctf/terminal && sudo npm ci --omit=dev
sudo chown -R student:student /opt/ctf/terminal   # undo root-owned node_modules (see §4.2)
sudo systemctl restart ctf-terminal
curl -sS -w '\nHTTP %{http_code}\n' http://localhost:3001/health   # expect {"status":"ok",...} HTTP 200
```

> **Do not** run `npm install <module>` manually to "patch" the gateway — it
> diverges from the lockfile and re-creates the drift that caused the crash.

### 11.4 GitHub Actions frontend deploy fails with permission denied

Check:

```bash
sudo systemctl show ctf-frontend --property=User --property=Group --no-pager
find /opt/ctf/frontend/.next -user root -printf '%u:%g %p\n' | head -20
```

Expected steady state:

```text
User=student
Group=student
no root-owned files in .next
```

If a deployment has partially deleted the live frontend tree, do not rely on restarting the existing service. Restore by rerunning deployment after ownership is corrected.

---

## 12. Security and Reliability Findings Requiring Follow-up

### 12.1 Secrets exposed during troubleshooting

Sensitive values were shown in copied diagnostic material, including:

- an authentication cookie/JWT-like browser token,
- backend database credentials,
- a JWT secret placeholder or related service configuration.

**Required action:** Rotate any real credentials or active secrets that were exposed, invalidate relevant sessions, and avoid posting unredacted headers or systemd environment values in future diagnostics.

### 12.2 Dynamic flag leakage in logs

The backend currently logs part of the generated challenge flag in `DockerService.runContainer()`:

```java
logger.info(" Flag: {}", (flag != null ? flag.substring(0, Math.min(flag.length(), 20)) : "null"));
```

This is inappropriate for a CTF system. Even partial disclosure can weaken challenges and exposes secret material to log readers.

**Recommended code change:**

```java
logger.info(" Flag injected into container environment");
```

or remove the log line entirely.

### 12.3 Unencrypted browser traffic

The site currently operates over HTTP and terminal connections over plain WebSockets (`ws://`). Authentication traffic, session cookies, terminal traffic, and challenge interactions should not traverse an unencrypted public network.

**Recommended next infrastructure task:**

1. Configure a TLS certificate in nginx.
2. Add an HTTPS `listen 443 ssl` server block.
3. Redirect HTTP to HTTPS.
4. Change frontend build variable back to:

   ```yaml
   NEXT_PUBLIC_TERMINAL_URL: wss://inno1-bif3-p1-w25.cs.technikum-wien.at/terminal
   ```

5. Review cookie security flags after HTTPS is enabled.

### 12.4 Challenge data stored within deployment directory

Challenge filesystem content is currently expected beneath:

```text
/opt/ctf/backend/challenges
```

This mixes mutable uploaded/runtime challenge data with deployed application files.

**Recommended architecture improvement:**

Move persistent challenge data to a dedicated data path, for example:

```text
/opt/ctf/data/challenges
```

and configure:

```properties
challenges.base.path=/opt/ctf/data/challenges
```

Benefits:

- Deployments cannot accidentally delete uploaded challenge data.
- Ownership and backup rules are clearer.
- Application binaries and mutable state are separated.

### 12.5 Non-atomic frontend deployment

The workflow currently deletes the live `.next` directory before copying the replacement. If copying fails, the frontend deployment becomes incomplete and service restart fails.

**Recommended improvement:** Use release directories and an atomic symlink switch:

```text
/opt/ctf/frontend/releases/<build-id>/
/opt/ctf/frontend/current -> /opt/ctf/frontend/releases/<build-id>
```

Deployment flow:

1. Copy/build new release into a new directory.
2. Verify `server.js` exists.
3. Atomically update `current` symlink.
4. Restart service against `current`.
5. Keep at least one previous release for rollback.

This prevents a failed deployment from deleting the currently working frontend.

### 12.6 Service-account design

Running Next.js as `student` solves the immediate ownership mismatch because the same account performs deployments. A stronger production design would be:

- dedicated `ctf-frontend` service user,
- controlled group permissions for deployment,
- atomic release directories,
- no service processes running as root,
- least privilege for backend Docker access.

---

## 13. Recommended Priority Backlog

| Priority | Task | Reason |
|---|---|---|
| Critical | Rotate exposed credentials/tokens/secrets | Material may have been disclosed during troubleshooting |
| Critical | Configure HTTPS/WSS | Current public communication is unencrypted |
| High | Remove partial flag logging | Secret leakage in application logs |
| High | Convert frontend deploy to atomic releases | Prevent partial deletion outages |
| Medium | Move challenge data to `/opt/ctf/data/challenges` | Separate persistent state from deployment artifacts |
| Medium | Formalize service users/groups and directory permissions | Reduce recurring permission failures |
| Medium | Improve backend build/start exception logging | Avoid generic HTTP 500 diagnosis loops |

---

## 14. Current Known-Good Verification Checklist

Run after a deployment or maintenance change:

```bash
# Services
sudo systemctl status ctf-backend --no-pager -l
sudo systemctl status ctf-frontend --no-pager -l
sudo systemctl status ctf-terminal --no-pager -l

# HTTP application endpoints
curl -sf http://localhost:8080/api/health
curl -sf http://localhost:3000 > /dev/null
curl -sf http://localhost:3001/health

# Frontend ownership contract
sudo systemctl show ctf-frontend --property=User --property=Group --no-pager
find /opt/ctf/frontend/.next -user root -printf '%u:%g %p\n' | head -20

# Backend challenge access contract
namei -l /opt/ctf/backend/challenges
sudo -u ctf ls -la /opt/ctf/backend/challenges

# Public proxy listeners
sudo ss -tlnp | grep -E ':(80|443|3000|3001|8080)\b'
```

Current expected conditions until HTTPS is implemented:

```text
ctf-backend:  running as ctf
ctf-frontend: running as student:student
ctf-terminal: running
nginx:        listening on port 80
frontend:     listening on port 3000
terminal:     listening on port 3001
backend:      listening on port 8080
frontend WebSocket build URL: ws://.../terminal
```

---

## 15. Change Log from Investigation

| Date | Change | Verification |
|---|---|---|
| 2026-05-25 | Set backend challenge storage group access for `ctf` | Challenge Dockerfile became readable; container started successfully |
| 2026-05-25 | Enabled setgid on `/opt/ctf/backend/challenges` | Parent displayed `drwxrws--- student ctf challenges` |
| 2026-05-25 | Changed frontend terminal URL from `wss://` to `ws://` | Deployed bundle contained `ws://.../terminal/?instanceId=...&containerName=...&sshPort=...`; terminal worked |
| 2026-05-25 | Configured frontend service to run as `student:student` | Service returned HTTP 200; no root-owned `.next` files remained |
| 2026-05-25 | Reran failed frontend deployment after partial `.next` deletion | Missing standalone server restored; frontend operational |
| 2026-08-01 | Reinstalled terminal `node_modules` from the committed lockfile after `MODULE_NOT_FOUND: dotenv` crash loop | `curl http://localhost:3001/health` returned `HTTP 200` |
| 2026-08-01 | Deploy workflow now ships terminal `package.json`/`package-lock.json` and runs `npm ci --omit=dev` on the host | Health check step passes with `Terminal: OK` |

---

## 16. Evidence and Confidence Notes

The conclusions in this document are grounded in:

- backend source shared during investigation, including `EnvironmentController`, `EnvironmentService`, `DockerService`, `ChallengeFileStorageService`, and `ChallengeService`;
- deployment workflow content shared during investigation;
- production `systemctl`, `namei`, `ls`, nginx, `ss`, `curl`, `journalctl`, and deployed bundle inspection outputs;
- successful browser confirmation that the interactive terminal now works.

Items presented as future recommendations—TLS adoption, atomic releases, persistent-data relocation, and service account redesign—have not yet been implemented unless explicitly marked otherwise.

---

**End of runbook**
