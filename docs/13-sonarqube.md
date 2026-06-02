# SonarQube

---

## Purpose

SonarQube analysis is configured for the monorepo from the `sonar/` directory. The scan uses frontend LCOV coverage from Vitest and backend XML coverage from JaCoCo.

## Files

| Path | Purpose |
|------|---------|
| `sonar/sonar-project.properties` | SonarQube project, source, test, exclusion, and coverage paths |
| `sonar/run-sonar.bat` | Windows helper that runs coverage-producing tests and starts SonarScanner in Docker |
| `ctf-frontend/coverage/lcov.info` | Frontend coverage report consumed by SonarQube |
| `ctf-backend/target/site/jacoco/jacoco.xml` | Backend coverage report consumed by SonarQube |

## Prerequisites

| Tool | Requirement |
|------|-------------|
| Docker | Required for `sonarsource/sonar-scanner-cli` |
| Node.js | Required for frontend tests |
| Java | Required for backend tests |
| SonarQube | Available locally or through `SONAR_HOST_URL` |

## Starting SonarQube

SonarQube is available as an optional Docker Compose profile. It is not part of the default CTF application stack.

```bat
docker compose --profile sonar up -d sonarqube
```

Open the local server:

```text
http://localhost:9000
```

The first startup can take a minute or two. Create a token in SonarQube and expose it as `SONAR_TOKEN` before running a scan.

## Running A Scan

Set a token in the current shell. Do not commit tokens.

```bat
set SONAR_TOKEN=<token>
```

If SonarQube is not running on `http://host.docker.internal:9000`, set the host URL:

```bat
set SONAR_HOST_URL=http://localhost:9000
```

Run the scanner helper from the repository root:

```bat
sonar\run-sonar.bat
```

The script stops on the first failing step:

1. `ctf-frontend`: `npm run test:coverage`
2. `ctf-backend`: `.\mvnw.cmd test`
3. Docker SonarScanner with `sonar/sonar-project.properties`

After a successful scan, open:

```text
http://localhost:9000/dashboard?id=InnoLab-Project
```

## Notes

- `sonar/sonar-project.properties` keeps source paths relative to the repository root.
- `sonar/run-sonar.bat` changes to the repository root before running tests and scanner commands.
- The token is read from `SONAR_TOKEN`; it is never hardcoded in the script.
- The Compose service uses persistent Docker volumes for SonarQube data, extensions, and logs.
