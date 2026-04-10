"use client";

import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";
import { X } from "lucide-react";

interface KaliTerminalProps {
    instanceId?: string;
    sshPort?: number;
    containerName?: string;
    onClose: () => void;
}

export default function KaliTerminal({ instanceId, sshPort, containerName, onClose }: KaliTerminalProps) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const terminalInstanceRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const isInitializedRef = useRef(false);
    const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error" | "missing_props">("connecting");

    useEffect(() => {
        if (!sshPort || !instanceId || !terminalRef.current || isInitializedRef.current) {
            if (!sshPort || !instanceId) {
                setConnectionStatus("missing_props");
            }
            return;
        }

        isInitializedRef.current = true;

        try {
            const terminal = new Terminal({
                cursorBlink: true,
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                theme: {
                    background: "#1e1e1e",
                    foreground: "#00ff00",
                    cursor: "#00ff00",
                },
                cols: 80,
                rows: 24,
                allowTransparency: false,
                convertEol: true,
                scrollback: 1000,
            });

            const fitAddon = new FitAddon();
            terminal.loadAddon(fitAddon);
            terminal.loadAddon(new WebLinksAddon());

            terminalInstanceRef.current = terminal;
            fitAddonRef.current = fitAddon;

            terminal.open(terminalRef.current);

            // Simple welcome message without control characters
            terminal.writeln("CTF Challenge Terminal");
            terminal.writeln("Connecting...\r\n");

            setTimeout(() => {
                fitAddon.fit();
                terminal.focus();
            }, 100);

            const terminalUrl = process.env.NEXT_PUBLIC_TERMINAL_URL || "ws://localhost:3001";
            const wsUrl = `${terminalUrl}/?instanceId=${instanceId}&containerName=${containerName || `ctf-${instanceId.substring(0, 8)}`}&sshPort=${sshPort}`;

            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;

            ws.onopen = () => {
                setConnectionStatus("connected");
                terminal.writeln("Connected!\r\n");
            };

            ws.onmessage = (event) => {
                try {
                    let data = event.data;

                    if (data instanceof ArrayBuffer) {
                        terminal.write(new Uint8Array(data));
                    } else if (typeof data === 'string') {
                        terminal.write(data);
                    } else if (data instanceof Blob) {
                        data.arrayBuffer().then(buffer => {
                            terminal.write(new Uint8Array(buffer));
                        });
                    }
                } catch (error) {
                    console.error('Message handler error:', error);
                }
            };

            ws.onerror = () => {
                setConnectionStatus("error");
                terminal.writeln("\r\nConnection error");
            };

            ws.onclose = () => {
                setConnectionStatus("disconnected");
            };

            const disposable = terminal.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                } else {
                    terminal.write('\r\nNot connected\r\n');
                }
            });

            return () => {
                disposable.dispose();
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close(1000, "Unmounting");
                }
                try {
                    terminal.dispose();
                } catch (error) {
                    console.error("Dispose error:", error);
                }
                terminalInstanceRef.current = null;
                wsRef.current = null;
                isInitializedRef.current = false;
            };
        } catch (error) {
            console.error("Terminal init error:", error);
            setConnectionStatus("error");
        }
    }, [instanceId, sshPort, containerName]);

    useEffect(() => {
        const handleResize = () => {
            try {
                if (fitAddonRef.current && terminalRef.current) {
                    fitAddonRef.current.fit();
                }
            } catch (error) {
                // Ignore
            }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleTerminalClick = () => {
        if (terminalInstanceRef.current) {
            terminalInstanceRef.current.focus();
        }
    };

    useEffect(() => {
        const terminal = terminalInstanceRef.current;
        if (!terminal || !terminalRef.current) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl+Shift+C - Copy
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
                event.preventDefault();
                event.stopPropagation();
                const selection = terminal.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection);
                }
                return false;
            }
            // Ctrl+Shift+V - Paste
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
                event.preventDefault();
                event.stopPropagation();
                navigator.clipboard.readText().then(text => {
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(text);
                    }
                }).catch(err => console.error('Paste error:', err));
                return false;
            }
        };

        // Capture phase to intercept before browser
        terminalRef.current.addEventListener('keydown', handleKeyDown, true);
        return () => {
            terminalRef.current?.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case "connected": return "text-green-500";
            case "connecting": return "text-yellow-500";
            case "error": return "text-red-500";
            case "missing_props": return "text-orange-500";
            default: return "text-gray-500";
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case "connected": return "Connected";
            case "connecting": return "Connecting...";
            case "error": return "Error";
            case "missing_props": return "Missing data";
            default: return "Disconnected";
        }
    };

    if (!sshPort || !instanceId) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md p-6">
                    <h2 className="text-lg font-semibold text-red-500 mb-4">Terminal Error</h2>
                    <p className="text-muted-foreground mb-4">Missing instance data.</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                    <div>
                        <h2 className="text-lg font-semibold mb-1">Challenge Terminal</h2>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Status: <span className={getStatusColor()}>{getStatusText()}</span></span>
                            <span>ID: {instanceId.substring(0, 12)}...</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Terminal */}
                <div className="flex-1 p-4 overflow-hidden">
                    <div
                        ref={terminalRef}
                        className="w-full h-full rounded-lg border border-border cursor-text"
                        style={{ background: "#1e1e1e" }}
                        onClick={handleTerminalClick}
                        onMouseDown={handleTerminalClick}
                    />
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-border text-xs text-muted-foreground bg-muted/30">
                    <div className="flex justify-between items-center">
                        <div>User: ctfuser</div>
                        <div className="text-right">
                            <div>Ctrl+Shift+C to copy • Ctrl+Shift+V to paste</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}