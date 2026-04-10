#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_HOST="inno1-bif3-p1-w25.cs.technikum-wien.at"
DEPLOY_DIR="/opt/ctf"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "  CTF Platform Deployment Script"
echo "=========================================="
echo

# Check if running on remote server
ON_SERVER=false
if [[ "$(hostname -f 2>/dev/null)" == *"$SERVER_HOST"* ]] || [[ "$(hostname -I 2>/dev/null)" =~ 10\. ]] || [[ "$1" == "--local" ]]; then
    ON_SERVER=true
    log_info "Running on production server"
fi

# Build Frontend
log_info "Building frontend..."
cd "$SCRIPT_DIR/ctf-frontend"
NEXT_PUBLIC_TERMINAL_URL=ws://inno1-bif3-p1-w25.cs.technikum-wien.at:80/terminal \
npm run build > /dev/null 2>&1
log_info "Frontend build complete"

# Deploy based on location
if [[ "$ON_SERVER" == "true" ]]; then
    log_info "Deploying to $DEPLOY_DIR..."
    
    # Backend
    log_info "Deploying backend..."
    # Backend is already built, just ensure JAR is in place
    if [[ -f "$SCRIPT_DIR/ctf-backend/target/app.jar" ]]; then
        cp "$SCRIPT_DIR/ctf-backend/target/app.jar" "$DEPLOY_DIR/backend/app.jar"
    elif [[ -f "$SCRIPT_DIR/ctf-backend/build/libs/"*.jar ]]; then
        cp "$SCRIPT_DIR/ctf-backend/build/libs/"*.jar "$DEPLOY_DIR/backend/app.jar"
    fi
    
    # Frontend - remove old build or use sudo
    log_info "Deploying frontend..."
    if rm -rf "$DEPLOY_DIR/frontend/.next" 2>/dev/null; then
        cp -r "$SCRIPT_DIR/ctf-frontend/.next" "$DEPLOY_DIR/frontend/"
    else
        sudo rm -rf "$DEPLOY_DIR/frontend/.next"
        sudo cp -r "$SCRIPT_DIR/ctf-frontend/.next" "$DEPLOY_DIR/frontend/"
    fi
    
    # Frontend symlinks for node_modules
    cd "$DEPLOY_DIR/frontend"
    ln -sf "$SCRIPT_DIR/ctf-frontend/node_modules" node_modules 2>/dev/null || true
    ln -sf "$SCRIPT_DIR/ctf-frontend/package.json" package.json 2>/dev/null || true
    ln -sf "$SCRIPT_DIR/ctf-frontend/package-lock.json" package-lock.json 2>/dev/null || true
    
    # Terminal
    log_info "Deploying terminal..."
    cp "$SCRIPT_DIR/ctf-terminal/server.js" "$DEPLOY_DIR/terminal/server.js"
    
    # Restart services
    log_info "Restarting services..."
    sudo systemctl restart ctf-backend ctf-frontend ctf-terminal 2>/dev/null || \
        systemctl restart ctf-backend ctf-frontend ctf-terminal
    
    # Wait for services
    sleep 3
    
    # Health checks
    log_info "Running health checks..."
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        log_info "Frontend: OK"
    else
        log_error "Frontend: FAILED"
    fi
    
    if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
        log_info "Terminal: OK"
    else
        log_error "Terminal: FAILED"
    fi
    
    if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1 || curl -sf http://localhost:8080/api/challenges > /dev/null 2>&1; then
        log_info "Backend: OK"
    else
        log_error "Backend: FAILED"
    fi
    
    log_info "Deployment complete!"
    log_warn "Hard refresh browser (Ctrl+Shift+R) to see changes"
else
    log_info "Build complete! To deploy remotely, run:"
    echo "  rsync -avz --exclude '.next/cache' --exclude 'node_modules' $SCRIPT_DIR/ctf-backend/target/app.jar $SERVER_HOST:$DEPLOY_DIR/backend/"
    echo "  rsync -avz --exclude '.next/cache' --exclude 'node_modules' $SCRIPT_DIR/ctf-frontend/.next $SERVER_HOST:$DEPLOY_DIR/frontend/"
    echo "  rsync -avz $SCRIPT_DIR/ctf-terminal/server.js $SERVER_HOST:$DEPLOY_DIR/terminal/"
    echo "  ssh $SERVER_HOST 'systemctl restart ctf-backend ctf-frontend ctf-terminal'"
fi