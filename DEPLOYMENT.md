# CTF Platform Deployment Guide

## Local Development (Docker)

```bash
docker compose up -d
# Available at http://localhost:3000
```

## Production (Native Deployment)

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 16+

### Quick Deploy
```bash
./deploy.sh
```

### Manual Deploy

#### 1. Backend
```bash
# Build
cd ctf-backend
mvn clean package -DskipTests

# Deploy
cp target/app.jar /opt/ctf/backend/app.jar
systemctl restart ctf-backend
```

#### 2. Frontend
```bash
# Build
cd ctf-frontend
NEXT_PUBLIC_TERMINAL_URL=ws://inno1-bif3-p1-w25.cs.technikum-wien.at:80/terminal npm run build

# Deploy
rm -rf /opt/ctf/frontend/.next
cp -r .next /opt/ctf/frontend/

# Link node_modules
cd /opt/ctf/frontend
ln -sf /home/student/Inno/InnoLab-Project/ctf-frontend/node_modules node_modules
ln -sf /home/student/Inno/InnoLab-Project/ctf-frontend/package.json package.json
ln -sf /home/student/Inno/InnoLab-Project/ctf-frontend/package-lock.json package-lock.json

systemctl restart ctf-frontend
```

#### 3. Terminal
```bash
# Deploy
cp ctf-terminal/server.js /opt/ctf/terminal/server.js
systemctl restart ctf-terminal
```

#### 4. Nginx Reverse Proxy
```bash
# Enable terminal routing
cp ctf-nginx-terminal.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/ctf-nginx-terminal.conf /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Service Management

```bash
# Check status
systemctl status ctf-backend ctf-frontend ctf-terminal

# Restart
systemctl restart ctf-backend ctf-frontend ctf-terminal

# View logs
journalctl -u ctf-backend -f
journalctl -u ctf-frontend -f
journalctl -u ctf-terminal -f
```

### Health Checks

| Service      | URL                              |
|--------------|----------------------------------|
| Frontend     | http://inno1-bif3-p1-w25.cs.technikum-wien.at:3000 |
| Terminal    | http://inno1-bif3-p1-w25.cs.technikum-wien.at:3001/health |
| Backend     | http://inno1-bif3-p1-w25.cs.technikum-wien.at:8080/api/challenges |

### Troubleshooting

#### Terminal not connecting
1. Check if port 3001 is accessible:
   ```bash
   curl http://localhost:3001/health
   ```
2. Check terminal logs:
   ```bash
   journalctl -u ctf-terminal -f
   ```
3. If blocked by firewall, ensure nginx proxy is configured

#### Frontend not connecting to terminal
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser DevTools → Network for WebSocket errors
3. Verify `NEXT_PUBLIC_TERMINAL_URL` is set in build

### File Locations

| Service   | Deploy Path      | Source Path                      |
|-----------|------------------|----------------------------------|
| Backend   | /opt/ctf/backend | ctf-backend/target/app.jar       |
| Frontend  | /opt/ctf/frontend| ctf-frontend/.next              |
| Terminal | /opt/ctf/terminal| ctf-terminal/server.js          |
| Challenges| /opt/ctf/backend/challenges | challenges/ |

### Systemd Services

- `ctf-backend.service` - Java Spring Boot app
- `ctf-frontend.service` - Next.js app
- `ctf-terminal.service` - Node.js WebSocket terminal