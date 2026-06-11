"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "xterm/css/xterm.css";
import { X, Copy, Clipboard } from "lucide-react";
import { toast } from "sonner";
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
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);


    const handleCopy = useCallback(() => {
        const termEl = terminalInstanceRef.current;
        if (!termEl) return;
        const selection = termEl.getSelection();
        if (!selection) {
            toast("Nothing to copy", {
                description: "Select text in the terminal first",
                duration: 2000,
            });
            setContextMenu(null);
            return;
        }
        const copyToClipboard = (text: string) => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        };
        try {
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(selection).catch(() => copyToClipboard(selection));
            } else {
                copyToClipboard(selection);
            }
            toast.success("Copied", {
                description: "Text copied to clipboard",
                duration: 2000,
            });
        } catch {
            toast.error("Copy failed", {
                description: "Unable to write to clipboard",
                duration: 3000,
            });
        }
        setContextMenu(null);
    }, []);

    const sendText = useCallback((text: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(text);
            toast.success("Pasted", {
                description: "Text sent to terminal",
                duration: 2000,
            });
        }
    }, []);

    const handlePaste = useCallback(async () => {
        let pasted = false;
        try {
            if (navigator.clipboard?.readText) {
                const text = await navigator.clipboard.readText();
                if (text) { sendText(text); pasted = true; }
            }
        } catch { } // falls through to execCommand fallback
        if (!pasted) {
            // Fallback: hidden input + execCommand (works without clipboard permission)
            const input = document.createElement('input');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            input.style.pointerEvents = 'none';
            document.body.appendChild(input);
            input.focus();
            input.addEventListener('paste', (e: Event) => {
                const text = (e as ClipboardEvent).clipboardData?.getData('text/plain') || '';
                if (text) { sendText(text); pasted = true; }
                document.body.removeChild(input);
            });
            document.execCommand('paste');
            setTimeout(() => {
                if (document.body.contains(input)) document.body.removeChild(input);
                if (!pasted) {
                    toast.error("Paste blocked", {
                        description: "Grant clipboard permission in site settings or use Ctrl+Shift+V",
                        duration: 4000,
                    });
                }
            }, 200);
        }
        setContextMenu(null);
    }, [sendText]);
    useEffect(() => {
        if (!sshPort || !instanceId || !terminalRef.current || isInitializedRef.current) {
            if (!sshPort || !instanceId) {
                setConnectionStatus("missing_props");
            }
            return;
        }
        isInitializedRef.current = true;
        try {
            const term = new Terminal({
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
            term.loadAddon(fitAddon);
            term.loadAddon(new WebLinksAddon());
            terminalInstanceRef.current = term;
            fitAddonRef.current = fitAddon;
            term.open(terminalRef.current);
            term.writeln("CTF Challenge Terminal");
            term.writeln("Connecting...\r\n");
            setTimeout(() => {
                fitAddon.fit();
                term.focus();
            }, 100);
            const terminalUrl = process.env.NEXT_PUBLIC_TERMINAL_URL || "ws://localhost:3001";
            const wsUrl = `${terminalUrl}/?instanceId=${instanceId}&containerName=${containerName || `ctf-${instanceId.substring(0, 8)}`}&sshPort=${sshPort}`;
            const ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';
            wsRef.current = ws;
            ws.onopen = () => {
                setConnectionStatus("connected");
                term.writeln("Connected!\r\n");
            };
            ws.onmessage = (event) => {
                try {
                    let data = event.data;
                    if (data instanceof ArrayBuffer) {
                        term.write(new Uint8Array(data));
                    } else if (typeof data === 'string') {
                        term.write(data);
                    } else if (data instanceof Blob) {
                        data.arrayBuffer().then(buffer => {
                            term.write(new Uint8Array(buffer));
                        });
                    }
                } catch (error) {
                    console.error('Message handler error:', error);
                }
            };
            ws.onerror = () => {
                setConnectionStatus("error");
                term.writeln("\r\nConnection error");
            };
            ws.onclose = () => {
                setConnectionStatus("disconnected");
            };
            const disposable = term.onData((data) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(data);
                } else {
                    term.write('\r\nNot connected\r\n');
                }
            });
            return () => {
                disposable.dispose();
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close(1000, "Unmounting");
                }
                try {
                    term.dispose();
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
        const termEl = terminalInstanceRef.current;
        const domEl = terminalRef.current;
        if (!termEl || !domEl) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyC') {
                event.preventDefault();
                event.stopPropagation();
                handleCopy();
                return false;
            }
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyV') {
                event.preventDefault();
                event.stopPropagation();
                handlePaste();
                return false;
            }
        };
        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();
            setContextMenu({ x: event.clientX, y: event.clientY });
        };
        const handleClickOutside = () => setContextMenu(null);
        domEl.addEventListener('keydown', handleKeyDown, true);
        domEl.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('scroll', handleClickOutside, true);
        return () => {
            domEl.removeEventListener('keydown', handleKeyDown, true);
            domEl.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('scroll', handleClickOutside, true);
        };
    }, [handleCopy, handlePaste]);
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
                <div className="flex-1 p-4 overflow-hidden relative">
                    <div
                        ref={terminalRef}
                        className="w-full h-full rounded-lg border border-border cursor-text"
                        style={{ background: "#1e1e1e" }}
                        onClick={handleTerminalClick}
                        onMouseDown={handleTerminalClick}
                    />
                    {contextMenu && (
                        <div
                            className="fixed z-50 bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[160px]"
                            style={{ left: contextMenu.x, top: contextMenu.y }}
                        >
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors cursor-pointer"
                            >
                                <Copy className="w-4 h-4" />
                                Copy
                            </button>
                            <button
                                onClick={handlePaste}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors cursor-pointer"
                            >
                                <Clipboard className="w-4 h-4" />
                                Paste
                            </button>
                        </div>
                    )}
                </div>
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