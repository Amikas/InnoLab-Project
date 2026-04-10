// ctf-terminal/server.js
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const { Client } = require('ssh2');
const net = require('net');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Basic CORS
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

// Health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "ok", 
        connections: wss.clients.size 
    });
});

// Helper to check if SSH port is actually responding
async function checkSSHPort(host, port, timeout = 10000) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ 
            host, 
            port, 
            timeout,
            // Add lookup timeout for DNS resolution
            lookup: (hostname, options, callback) => {
                require('dns').lookup(hostname, options, callback);
            }
        });
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            socket.destroy();
            console.log(`[SSH Check]  Port ${port} on ${host} is reachable`);
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log(`[SSH Check] ⏱ Timeout connecting to ${host}:${port}`);
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (err) => {
            console.log(`[SSH Check]  Error connecting to ${host}:${port}: ${err.code}`);
            resolve(false);
        });
    });
}

// Helper to wait for SSH to be ready with exponential backoff
async function waitForSSH(host, port, maxAttempts = 12, baseDelay = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[SSH Check] Attempt ${attempt}/${maxAttempts} for ${host}:${port}`);
        
        const isReady = await checkSSHPort(host, port);
        
        if (isReady) {
            console.log(`[SSH Check]  SSH is ready on ${host}:${port}`);
            return true;
        }
        
        if (attempt < maxAttempts) {
            // Exponential backoff: 2s, 3s, 4.5s, 6.7s, etc (max ~60s total)
            const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 10000);
            console.log(`[SSH Check] Not ready yet, waiting ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.log(`[SSH Check]  SSH failed to become ready after ${maxAttempts} attempts`);
    return false;
}

// Helper to connect SSH with retry
async function connectSSHWithRetry(config, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const conn = new Client();
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    conn.removeAllListeners();
                    conn.end();
                    reject(new Error('SSH handshake timeout'));
                }, 10000);

                conn.once('ready', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                conn.once('error', (err) => {
                    clearTimeout(timeout);
                    console.error(`[${config.instanceId}] SSH Error:`, err.message);
                    console.error(`[${config.instanceId}] SSH Error Code:`, err.code);
                    console.error(`[${config.instanceId}] SSH Error Level:`, err.level);
                    reject(err);
                });

                console.log(`[${config.instanceId}] SSH connect config:`, JSON.stringify({
                    host: config.host,
                    port: config.port,
                    username: config.username,
                    readyTimeout: config.readyTimeout,
                    tryKeyboard: config.tryKeyboard
                }));
                console.log(`[${config.instanceId}] SSH connection attempt ${attempt}/${maxRetries}`);
                conn.connect(config);
            });
            
            return conn; // Success!
            
        } catch (err) {
            console.error(`[${config.instanceId}] SSH attempt ${attempt}/${maxRetries} FAILED:`, err.message);
            console.error(`[${config.instanceId}] Error stack:`, err.stack);
            
            if (attempt === maxRetries) {
                throw err; // Final attempt failed
            }
            
            // Wait before retry
            console.log(`[${config.instanceId}] Waiting 2s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
}

// WebSocket connection handler
wss.on("connection", async (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const containerName = url.searchParams.get("containerName");
    const instanceId = url.searchParams.get("instanceId");
    const sshPort = url.searchParams.get("sshPort");

    console.log(`[${instanceId}] New connection → Container: ${containerName}, SSH Port: ${sshPort}`);

    // Validate container name
    if (!containerName) {
        ws.send("Error: No container name specified\r\n");
        ws.close();
        return;
    }

    // Use sshPort if provided (mapped port on host), otherwise use container name with port 22
    // For containers in ctf-isolated network, connect via localhost with mapped port
    const sshHost = sshPort ? '127.0.0.1' : containerName;
    const sshPortNum = sshPort ? parseInt(sshPort, 10) : 22;

    console.log(`[${instanceId}] Connecting to SSH at ${sshHost}:${sshPortNum}`);

    // Send status update to client
    ws.send(`\r\n\x1b[1;36m Waiting for SSH service to start...\x1b[0m\r\n`);
    
    // Wait for SSH to be ready
    const sshReady = await waitForSSH(sshHost, sshPortNum);
    
    if (!sshReady) {
        ws.send(`\r\n\x1b[1;31m SSH service failed to start\x1b[0m\r\n`);
        ws.send(`\x1b[1;33mPlease try again in a moment or contact support\x1b[0m\r\n`);
        ws.close();
        return;
    }

    ws.send(`\r\n\x1b[1;32m SSH service is ready!\x1b[0m\r\n`);
    ws.send(`\x1b[1;36m Establishing secure connection...\x1b[0m\r\n`);

    // SSH connection with retry - use sshHost and sshPortNum
    let conn;
    let shell = null;

    try {
        conn = await connectSSHWithRetry({
            host: sshHost,
            port: sshPortNum,
            username: 'ctfuser',
            password: 'ctfpassword',
            readyTimeout: 10000,
            tryKeyboard: true,
            instanceId: instanceId
        });
    } catch (err) {
        console.error(`[${instanceId}] All SSH connection attempts failed:`, err.message);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;31m Failed to establish SSH connection\x1b[0m\r\n`);
            ws.send(`\x1b[1;33mError: ${err.message}\x1b[0m\r\n`);
            ws.close();
        }
        return;
    }

    console.log(`[${instanceId}] SSH connected successfully to ${containerName}`);
    console.log(`[${instanceId}] Requesting shell...`);

    // Request shell immediately (connection is already ready)
    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
            console.error(`[${instanceId}] Failed to create shell:`, err.message);
            ws.send(`\r\n\x1b[1;31m Error creating shell: ${err.message}\x1b[0m\r\n`);
            conn.end();
            ws.close();
            return;
        }

        console.log(`[${instanceId}] Shell created successfully`);
        shell = stream;

        // SSH → WebSocket
        stream.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        stream.on('close', () => {
            console.log(`[${instanceId}] Shell closed`);
            ws.close();
            conn.end();
        });

        // Send success message
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;32m\x1b[0m\r\n`);
            ws.send(`\x1b[1;32m    Connected to ${containerName.padEnd(18)} \x1b[0m\r\n`);
            ws.send(`\x1b[1;32m\x1b[0m\r\n`);
            ws.send(`\r\n\x1b[1;33m You are now logged in as ctfuser\x1b[0m\r\n`);
            ws.send(`\x1b[1;33m Start exploring and find the flag!\x1b[0m\r\n\r\n`);
        }
    });

    conn.on('error', (err) => {
        console.error(`[${instanceId}] SSH error for ${containerName}:`, err.message);
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;31m SSH Connection failed: ${err.message}\x1b[0m\r\n`);
            ws.close();
        }
    });

    // WebSocket → SSH
    ws.on('message', (data) => {
        if (shell && shell.writable) {
            shell.write(data);
        } else {
            console.log(`[${instanceId}] Shell not ready, dropping input`);
        }
    });

    ws.on('close', () => {
        console.log(`[${instanceId}] WebSocket closed for ${containerName}`);
        if (shell) shell.end();
        if (conn) conn.end();
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(` CTF Terminal Gateway running on port ${PORT}`);
    console.log(` Listening on 0.0.0.0:${PORT}`);
    console.log(`⏳ SSH readiness checks enabled with exponential backoff`);
    console.log(` Using Docker network DNS for container connections`);
});