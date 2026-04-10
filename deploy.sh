#!/bin/bash
set -euo pipefail

SERVER_HOST="inno1-bif3-p1-w25.cs.technikum-wien.at"
DEPLOY_DIR="/opt/ctf"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  CTF Platform Deployment Script"
echo "=========================================="
echo

ON_SERVER=false
if [[ "$(hostname -f 2>/dev/null)" == *"$SERVER_HOST"* ]] || [[ "$(hostname -I 2>/dev/null)" =~ 10\. ]] || [[ "${1:-}" == "--local" ]]; then
    ON_SERVER=true
    log_info "Running on production server"
else
    log_info "Running on local/development machine"
fi

[[ -d "$SCRIPT_DIR/ctf-frontend" ]] || log_error "Frontend directory not found: $SCRIPT_DIR/ctf-frontend"
[[ -d "$SCRIPT_DIR/ctf-backend" ]] || log_error "Backend directory not found: $SCRIPT_DIR/ctf-backend"

log_info "Building backend..."
cd "$SCRIPT_DIR/ctf-backend"
if [[ -f "pom.xml" ]]; then
    mvn clean package -DskipTests -Dcheckstyle.skip=true -q
elif [[ -f "build.gradle" ]]; then
    ./gradlew clean build -x test -q
fi

log_info "Building frontend..."
cd "$SCRIPT_DIR/ctf-frontend"
npm install
env NEXT_PUBLIC_TERMINAL_URL=ws://inno1-bif3-p1-w25.cs.technikum-wien.at:80/terminal npm run build
log_info "Frontend build complete"

cd "$SCRIPT_DIR"

if [[ "$ON_SERVER" != "true" ]]; then
    log_info "Build complete! To deploy remotely, run:"
    echo "  rsync -avz --exclude '.next/cache' --exclude 'node_modules' $SCRIPT_DIR/ctf-backend/target/app.jar $SERVER_HOST:$DEPLOY_DIR/backend/"
    echo "  rsync -avz --exclude '.next/cache' --exclude 'node_modules' $SCRIPT_DIR/ctf-frontend/.next $SERVER_HOST:$DEPLOY_DIR/frontend/"
    echo "  rsync -avz $SCRIPT_DIR/ctf-terminal/server.js $SERVER_HOST:$DEPLOY_DIR/terminal/"
    echo "  ssh $SERVER_HOST 'systemctl restart ctf-backend ctf-frontend ctf-terminal'"
    exit 0
fi

log_info "Deploying to $DEPLOY_DIR..."

BACKEND_JAR=""
if [[ -f "$SCRIPT_DIR/ctf-backend/target/app.jar" ]]; then
    BACKEND_JAR="$SCRIPT_DIR/ctf-backend/target/app.jar"
elif [[ -n "$(find "$SCRIPT_DIR/ctf-backend/build/libs" -maxdepth 1 -type f -name "*.jar" 2>/dev/null | head -n1)" ]]; then
    BACKEND_JAR=$(find "$SCRIPT_DIR/ctf-backend/build/libs" -maxdepth 1 -type f -name "*.jar" 2>/dev/null | head -n1)
elif [[ -n "$(find "$SCRIPT_DIR/ctf-backend/target" -maxdepth 1 -type f -name "ctfbackend-*.jar" 2>/dev/null | head -n1)" ]]; then
    BACKEND_JAR=$(find "$SCRIPT_DIR/ctf-backend/target" -maxdepth 1 -type f -name "ctfbackend-*.jar" 2>/dev/null | head -n1)
fi

if [[ -n "$BACKEND_JAR" ]]; then
    log_info "Deploying backend..."
    cp "$BACKEND_JAR" "$DEPLOY_DIR/backend/app.jar"
else
    log_error "No backend JAR found"
fi

log_info "Deploying frontend..."
sudo rm -rf "$DEPLOY_DIR/frontend/.next"
sudo cp -r "$SCRIPT_DIR/ctf-frontend/.next" "$DEPLOY_DIR/frontend/"
cd "$DEPLOY_DIR/frontend"
ln -sf "$SCRIPT_DIR/ctf-frontend/package.json" package.json
ln -sf "$SCRIPT_DIR/ctf-frontend/package-lock.json" package-lock.json

log_info "Deploying terminal..."
cp "$SCRIPT_DIR/ctf-terminal/server.js" "$DEPLOY_DIR/terminal/server.js"

log_info "Restarting services..."
sudo systemctl restart ctf-backend ctf-frontend ctf-terminal

log_info "Waiting for services to start..."
sleep 3

log_info "Running health checks..."

curl -sf http://localhost:3000 > /dev/null 2>&1 || log_error "Frontend health check failed"
log_info "Frontend: OK"

curl -sf http://localhost:3001/health > /dev/null 2>&1 || log_error "Terminal health check failed"
log_info "Terminal: OK"

curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1 || curl -sf http://localhost:8080/api/challenges > /dev/null 2>&1 || log_error "Backend health check failed"
log_info "Backend: OK"

log_info "Deployment complete!"
log_warn "Hard refresh browser (Ctrl+Shift+R) to see changes"