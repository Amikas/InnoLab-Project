// ctf-terminal/server.js
// Terminal gateway: WebSocket → SSH bridge into per-user challenge containers.
//
// Logging: pino with built-in redaction of identifier fields, so contributors
// cannot accidentally leak containerName/sshPort/instanceId/password through
// the log stream. Set LOG_LEVEL=debug in dev for verbose output.
//
// Security: CTF_SSH_PASSWORD is required from the environment. The gateway
// refuses to start without it (fail-fast) rather than booting insecure.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const { Client } = require('ssh2');
const net = require('net');
const pino = require('pino');

// SECURITY: fail-fast on missing SSH password rather than booting insecure.
const CTF_SSH_PASSWORD = process.env.CTF_SSH_PASSWORD;
if (!CTF_SSH_PASSWORD) {
    process.stderr.write(
        "FATAL: CTF_SSH_PASSWORD environment variable is required. " +
        "Set it in .env (see .env.example) or your docker-compose environment block.\n"
    );
    process.exit(1);
}

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();
const logger = pino({
    level: LOG_LEVEL,
    redact: {
        // Scrub credentials and identifiers that correlate to a user's
        // session so contributors can't accidentally leak them through
        // any logger call. Defensive — default-deny.
        paths: [
            'password', 'ctfpassword', 'CTF_SSH_PASSWORD',
            '*.password', '*.ctfpassword',
            // host stays redacted because in Docker DNS mode it carries the
            // container name (a session-correlating identifier). port is safe
            // to expose (22 in Docker mode, the mapped port in native dev),
            // so the readiness/connect probes keep some debuggability.
            'host', '*.host',
            'containerName', 'sshPort', 'instanceId', 'sshHost', 'sshPortNum',
            '*.containerName', '*.sshPort', '*.instanceId', '*.sshHost', '*.sshPortNum',
            'config.password', 'config.username',
        ],
        censor: '[REDACTED]',
    },
    base: { service: 'ctf-terminal' },
    timestamp: pino.stdTimeFunctions.isoTime,
});

// When running inside Docker, connect via container name on port 22.
// When running natively on host, connect via 127.0.0.1:<mapped-port>.
const USE_DOCKER_DNS = process.env.USE_DOCKER_DNS === 'true';

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
        connections: wss.clients.size,
    });
});

// Helper to check if SSH port is actually responding
async function checkSSHPort(host, port, timeout = 10000) {
    return new Promise((resolve) => {
        const socket = net.createConnection({
            host, port, timeout,
            lookup: (hostname, options, callback) => {
                require('dns').lookup(hostname, options, callback);
            }
        });

        socket.setTimeout(timeout);

        socket.on('connect', () => {
            socket.destroy();
            logger.info({ host, port }, 'SSH port reachable');
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            logger.warn({ host, port }, 'SSH port timeout');
            resolve(false);
        });

        socket.on('error', (err) => {
            logger.warn({ host, port, code: err.code }, 'SSH port error');
            resolve(false);
        });
    });
}

// Helper to wait for SSH to be ready with exponential backoff
async function waitForSSH(host, port, maxAttempts = 12, baseDelay = 2000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        logger.info({ host, port, attempt, maxAttempts }, 'SSH readiness probe');

        const isReady = await checkSSHPort(host, port);
        if (isReady) {
            logger.info({ host, port }, 'SSH is ready');
            return true;
        }

        if (attempt < maxAttempts) {
            const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), 10000);
            logger.debug({ delay }, 'Waiting before next attempt');
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    logger.error({ host, port, attempts: maxAttempts }, 'SSH failed to become ready');
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
                    logger.error({
                        instanceId: config.instanceId,
                        message: err.message,
                        code: err.code,
                        level: err.level,
                    }, 'SSH connect error');
                    reject(err);
                });

                logger.info({
                    instanceId: config.instanceId,
                    host: config.host,
                    port: config.port,
                    username: config.username,
                    attempt,
                    maxRetries,
                }, 'SSH connect attempt');
                conn.connect(config);
            });

            return conn;

        } catch (err) {
            logger.error({
                instanceId: config.instanceId,
                attempt, maxRetries,
                message: err.message,
            }, 'SSH attempt failed');

            if (attempt === maxRetries) {
                throw err;
            }

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

    logger.info({ instanceId, containerName, sshPort }, 'New connection');

    if (!containerName) {
        ws.send("Error: No container name specified\r\n");
        ws.close();
        return;
    }

    const sshHost = USE_DOCKER_DNS ? containerName : '127.0.0.1';
    const sshPortNum = USE_DOCKER_DNS ? 22 : (sshPort ? parseInt(sshPort, 10) : 22);

    logger.info({ instanceId, sshHost, sshPortNum }, 'Resolving SSH target');

    ws.send("\r\n\x1b[1;36m Waiting for SSH service to start...\x1b[0m\r\n");

    const sshReady = await waitForSSH(sshHost, sshPortNum);

    if (!sshReady) {
        ws.send("\r\n\x1b[1;31m SSH service failed to start\x1b[0m\r\n");
        ws.send("\x1b[1;33mPlease try again in a moment or contact support\x1b[0m\r\n");
        ws.close();
        return;
    }

    ws.send("\r\n\x1b[1;32m SSH service is ready!\x1b[0m\r\n");
    ws.send("\x1b[1;36m Establishing secure connection...\x1b[0m\r\n");

    let conn;
    let shell = null;

    try {
        conn = await connectSSHWithRetry({
            host: sshHost,
            port: sshPortNum,
            username: 'ctfuser',
            // SECURITY: read from env, never hard-coded.
            password: CTF_SSH_PASSWORD,
            readyTimeout: 10000,
            tryKeyboard: true,
            instanceId
        });
    } catch (err) {
        logger.error({ instanceId, message: err.message }, 'All SSH connection attempts failed');
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;31m Failed to establish SSH connection\x1b[0m\r\n`);
            ws.send(`\x1b[1;33mError: ${err.message}\x1b[0m\r\n`);
            ws.close();
        }
        return;
    }

    logger.info({ instanceId, containerName }, 'SSH connected');
    logger.info({ instanceId }, 'Requesting shell');

    conn.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
            logger.error({ instanceId, message: err.message }, 'Failed to create shell');
            ws.send(`\r\n\x1b[1;31m Error creating shell: ${err.message}\x1b[0m\r\n`);
            conn.end();
            ws.close();
            return;
        }

        logger.info({ instanceId }, 'Shell created');
        shell = stream;

        stream.on('data', (data) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
            }
        });

        stream.on('close', () => {
            logger.info({ instanceId }, 'Shell closed');
            ws.close();
            conn.end();
        });

        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;32m\x1b[0m\r\n`);
            ws.send(`\x1b[1;32m    Connected to ${containerName.padEnd(18)} \x1b[0m\r\n`);
            ws.send(`\x1b[1;32m\x1b[0m\r\n`);
            ws.send(`\r\n\x1b[1;33m You are now logged in as ctfuser\x1b[0m\r\n`);
            ws.send(`\x1b[1;33m Start exploring and find the flag!\x1b[0m\r\n\r\n`);
        }
    });

    conn.on('error', (err) => {
        logger.error({ instanceId, message: err.message }, 'SSH error');
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(`\r\n\x1b[1;31m SSH Connection failed: ${err.message}\x1b[0m\r\n`);
            ws.close();
        }
    });

    ws.on('message', (data) => {
        if (shell && shell.writable) {
            shell.write(data);
        } else {
            logger.debug({ instanceId }, 'Shell not ready, dropping input');
        }
    });

    ws.on('close', () => {
        logger.info({ instanceId, containerName }, 'WebSocket closed');
        if (shell) shell.end();
        if (conn) conn.end();
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, 'CTF Terminal Gateway listening');
});
