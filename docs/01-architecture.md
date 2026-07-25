# Architecture Overview

## High-Level System Context

```mermaid
graph TB
    Browser[User Browser] -->|HTTP :80| Nginx[nginx reverse proxy]
    
    Nginx -->|/api/*| Backend[Spring Boot Backend<br/>:8080]
    Nginx -->|/*| Frontend[Next.js Frontend<br/>:3000]
    Nginx -->|/terminal/*| Terminal[Node Terminal Gateway<br/>:3001]
    
    Backend -->|LDAP| LDAP[FH LDAP Server<br/>ldap.technikum-wien.at:636]
    Backend -->|JPA| DB[(PostgreSQL<br/>:5432)]
    Backend -->|Docker socket| Docker[Docker Engine]
    
    Terminal -->|SSH :22| Challenge[Challenge Containers]
    
    Docker -->|manages| Challenge
```

## Production Deployment View

```mermaid
graph TB
    subgraph "Production Host (inno1-bif3-p1-w25.cs.technikum-wien.at)"
        Nginx["nginx<br/>:80 (HTTP)"]
        
        subgraph "systemd Services"
            BE[ctf-backend<br/>User=ctf<br/>Java -jar app.jar<br/>:8080]
            FE[ctf-frontend<br/>User=student<br/>node server.js<br/>:3000]
            TG[ctf-terminal<br/>node server.js<br/>:3001]
        end
        
        subgraph "Storage"
            Challenges["/opt/ctf/backend/challenges/<br/>group=ctf, setgid"]
            FrontendFiles["/opt/ctf/frontend/.next/<br/>owned by student:student"]
            JAR["/opt/ctf/backend/app.jar"]
        end
        
        DockerEngine[Docker Engine<br/>/var/run/docker.sock]
        
        Nginx --> BE
        Nginx --> FE
        Nginx --> TG
        BE --> DockerEngine
        TG -->|SSH| ChallengeContainers[Challenge Containers<br/>ctf-network]
        DockerEngine --> ChallengeContainers
    end
    
    DB[(PostgreSQL 16)]
    LDAP[FH LDAP Server]
    
    BE --> DB
    BE --> LDAP
```

## Docker Development Topology

```mermaid
graph TB
    subgraph "Docker Network (ctf-network)"
        Frontend[ctf-frontend<br/>:3000]
        Backend[ctf-backend<br/>:8080]
        Terminal[ctf-terminal<br/>:3001]
        DB[(postgres:16<br/>:5432)]
        Challenge[Challenge Containers<br/>:30000-30999]
    end
    
    Browser[Browser] -->|localhost:3000| Frontend
    Browser -->|localhost:8080/api| Backend
    Browser -->|ws://localhost:3001| Terminal
    
    Backend -->|Docker socket| Challenge
    Terminal -->|SSH| Challenge
```

## Component Communication Flows

| Flow | Source | Destination | Protocol | Purpose |
|------|--------|-------------|----------|---------|
| Authentication | Frontend → Backend → LDAP | Backend | REST + LDAPS | Login via FH university credentials |
| Challenge CRUD | Frontend | Backend | REST (JSON) | Create/read/update/delete challenges |
| File Download | Frontend | Backend | REST (binary) | Download challenge attachments |
| Instance Start | Frontend | Backend | REST | Start per-user Docker container |
| Container Mgmt | Backend | Docker Engine | Unix socket | Build/run/stop containers |
| Terminal Access | Frontend (xterm.js) | Terminal Gateway | WebSocket | Real-time SSH terminal |
| SSH Session | Terminal Gateway | Challenge Container | SSH | Interactive shell inside container |
| Flag Submission | Frontend | Backend | REST | Validate and record flag |
| Hints | Frontend | Backend | REST | Reveal hints with time-lock |
| Scoreboard | Frontend | Backend | REST | Leaderboard and statistics |

## Port Map

| Port | Service | Environment | Protocol |
|------|---------|-------------|----------|
| 80 | nginx | Production | HTTP (no HTTPS yet) |
| 3000 | Next.js frontend | Both | HTTP |
| 3001 | Terminal gateway | Both | HTTP / WebSocket |
| 8080 | Spring Boot backend | Both | HTTP (REST API) |
| 5432 | PostgreSQL | Both | PostgreSQL protocol |
| 30000-30999 | Challenge containers | Both | SSH (mapped host ports) |
| 636 | FH LDAP server | External | LDAPS |
