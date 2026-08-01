"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Flag,
    Download,
    AlertCircle,
    CheckCircle2,
    Info,
    Terminal,
    XCircle,
    Play,
    Square,
    ExternalLink,
    Clock,
    Wifi,
    Monitor,
    Code,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import KaliTerminal from "@/components/KaliTerminalClient";
import type { Challenge, EnvironmentInstance } from "@/lib/types";
import { hasDownloadableFiles, requiresInstance } from "@/lib/types";

interface ChallengeDetailProps {
    challenge: Challenge;
    solveStats?: { solveCount: number; solvedByUser: boolean } | null;
    setSolveStats?: (stats: { solveCount: number; solvedByUser: boolean } | null) => void;
}

// Turn a raw API error into something a student can actually act on.
// Server-provided messages are curated by the backend, so they pass through;
// only transport-level or generic failures get rewritten here.
function friendlyEnvironmentError(rawMessage?: string): string {
    const msg = rawMessage || "";
    const lower = msg.toLowerCase();

    if (
        !msg ||
        lower.includes("failed to fetch") ||
        lower.includes("network error") ||
        lower.includes("network request failed")
    ) {
        return "Network error. Please check your connection and try again.";
    }
    if (lower.includes("request failed (") || lower.includes("internal server error")) {
        return "Something went wrong with the environment. Please try again in a few minutes.";
    }
    return msg;
}


export default function ChallengeDetail({ challenge, solveStats = null, setSolveStats }: ChallengeDetailProps) {
    const [flag, setFlag] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showTerminal, setShowTerminal] = useState(false);
    const [startingTerminal, setStartingTerminal] = useState(false);
    const [stoppingTerminal, setStoppingTerminal] = useState(false);
    const [result, setResult] = useState<{
        status: "success" | "error" | "warning" | "info";
        message: string;
    } | null>(null);
    const [solved, setSolved] = useState<boolean>(!!challenge.solved || !!solveStats?.solvedByUser);
    const [environment, setEnvironment] = useState<EnvironmentInstance | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<string>("");

    const [pointsEarned, setPointsEarned] = useState<number | null>(null);

    // Hint system state
    const [revealedHints, setRevealedHints] = useState<{ [index: number]: string }>({});
    const [hintNextUnlocksAt, setHintNextUnlocksAt] = useState<Date | null>(null);
    const [hintCountdown, setHintCountdown] = useState<string>("");

    // Load hint status on page load
    useEffect(() => {
        if (!challenge.hints || challenge.hints.length === 0) return;

        const loadHintStatus = async () => {
            try {
                const res = await apiClient.get<{ revealedIndexes: number[]; nextUnlocksAt: string }>(
                    `/api/hints/status/${challenge.id}`
                );

                // For each already-revealed hint, store the text from the challenge data
                const revealed: { [index: number]: string } = {};
                for (const index of res.revealedIndexes) {
                    revealed[index] = challenge.hints![index];
                }
                setRevealedHints(revealed);

                if (res.nextUnlocksAt) {
                    setHintNextUnlocksAt(new Date(res.nextUnlocksAt));
                }
            } catch (error) {
                console.error("Error loading hint status:", error);
            }
        };

        loadHintStatus();
    }, [challenge.id, challenge.hints]);

    // Countdown timer for hint time-lock
    useEffect(() => {
        if (!hintNextUnlocksAt) return;

        const interval = setInterval(() => {
            const secondsLeft = Math.ceil((hintNextUnlocksAt.getTime() - Date.now()) / 1000);
            if (secondsLeft <= 0) {
                setHintCountdown("");
                setHintNextUnlocksAt(null);
            } else {
                setHintCountdown(`${secondsLeft}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [hintNextUnlocksAt]);

    // Check for existing environment on component mount
    useEffect(() => {
        const checkExistingEnvironment = async () => {
            try {
                // If challenge has an instance ID stored, check its status
                if (challenge.instanceId) {
                    const res = await apiClient.get<EnvironmentInstance>(
                        `/api/environment/instance/${challenge.instanceId}`
                    );
                    if (res.status === "RUNNING") {
                        setEnvironment(res);
                        setShowTerminal(true);
                    }
                }
            } catch (error) {
                console.error("Error checking existing environment:", error);
            }
        };

        checkExistingEnvironment();
    }, [challenge.instanceId]);

    // Update time remaining every minute
    useEffect(() => {
        if (!environment) {
            setTimeRemaining("");
            return;
        }

        const updateTimeRemaining = () => {
            const expires = new Date(environment.expiresAt);
            const now = new Date();
            const diffMs = expires.getTime() - now.getTime();

            if (diffMs <= 0) {
                setTimeRemaining("Expired");
                // Auto-cleanup expired environment
                if (environment.status === "RUNNING") {
                    handleStopTerminal();
                }
                return;
            }

            const diffMins = Math.floor(diffMs / 60000);
            const diffSecs = Math.floor((diffMs % 60000) / 1000);

            if (diffMins > 0) {
                setTimeRemaining(`${diffMins}m ${diffSecs}s remaining`);
            } else {
                setTimeRemaining(`${diffSecs}s remaining`);
            }
        };

        updateTimeRemaining();
        const intervalId = setInterval(updateTimeRemaining, 1000);

        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [environment]);

    // Auto-poll environment status every 30 seconds when terminal is open
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (environment && showTerminal && environment.status === "RUNNING") {
            intervalId = setInterval(async () => {
                try {
                    const res = await apiClient.get<EnvironmentInstance>(
                        `/api/environment/instance/${environment.instanceId}`
                    );
                    setEnvironment(res);

                    // If environment stopped or expired, close terminal
                    if (res.status !== "RUNNING") {
                        setShowTerminal(false);
                        setResult({
                            status: "info",
                            message: "Environment has been stopped or expired."
                        });
                    }
                } catch (error) {
                    console.error("Error polling environment:", error);
                }
            }, 30000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [environment, showTerminal]);

    async function handleLaunchTerminal() {
        if (environment) {
            setShowTerminal(true);
            return;
        }

        setStartingTerminal(true);
        setResult(null);

        try {
            const res = await apiClient.post<EnvironmentInstance>(
                `/api/environment/build/${challenge.id}`,
                {}
            );

            setEnvironment(res);
            setShowTerminal(true);

            setResult({
                status: "success",
                message: `Environment ready! SSH Port: ${res.sshPort}`
            });
        } catch (error: any) {
            console.error("Failed to build and start environment:", error);
            setResult({
                status: "error",
                message: friendlyEnvironmentError(error?.message),
            });
        } finally {
            setStartingTerminal(false);
        }
    }

    async function handleStopTerminal() {
        if (!environment?.instanceId) return;

        setStoppingTerminal(true);

        try {
            await apiClient.post(`/api/environment/stop/${environment.instanceId}`, {});
            setEnvironment(null);
            setShowTerminal(false);
            setResult({
                status: "success",
                message: "Environment stopped successfully"
            });
        } catch (error: any) {
            console.error(" Failed to stop environment:", error);
            setResult({
                status: "error",
                message: friendlyEnvironmentError(error?.message),
            });
        } finally {
            setStoppingTerminal(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!flag.trim()) return;

        setSubmitting(true);
        setResult(null);

        try {
            const response = await apiClient.post<{
                status: string;
                message: string;
                solveCount?: number;
                pointsEarned?: number;
            }>("/api/flags/submit", {
                challengeId: challenge.id,
                flag: flag.trim()
            });

            setResult({
                status: response?.status as any || "error",
                message: response?.message || "",
            });

            if (response?.status === "success") {
                setFlag("");
                setSolved(true);
                if (response.pointsEarned !== undefined) {
                    setPointsEarned(response.pointsEarned);
                }
                
                // Update solve stats if provided in response
                if (response.solveCount !== undefined) {
                    // Create new solve stats if none exist, or update existing ones
                    const updatedSolveStats = solveStats ? {
                        ...solveStats,
                        solveCount: response.solveCount
                    } : {
                        solveCount: response.solveCount,
                        solvedByUser: true
                    };
                    
                    // Only update if we have the setter function
                    if (setSolveStats) {
                        setSolveStats(updatedSolveStats);
                    }
                    
                    // Show success message with solve count
                    setResult({
                        status: "success",
                        message: `Correct flag! ${response.solveCount} users have solved this challenge.`
                    });
                } else {
                    setResult({
                        status: "success",
                        message: "Correct flag!"
                    });
                }
            }
        } catch (error: any) {
            setResult({
                status: "error",
                message: error?.message || "An error occurred while submitting flag",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleRevealHint = async (index: number) => {
        try {
            const res = await apiClient.post<{ status: string; hintText?: string; unlocksAt?: string }>(
                "/api/hints/reveal",
                { challengeId: challenge.id, hintIndex: index }
            );

            if (res.status === "success" && res.hintText) {
                setRevealedHints(prev => ({ ...prev, [index]: res.hintText! }));
                setHintNextUnlocksAt(new Date(Date.now() + 60000));
            } else if (res.status === "locked" && res.unlocksAt) {
                setHintNextUnlocksAt(new Date(res.unlocksAt));
            }
        } catch (error) {
            console.error("Error revealing hint:", error);
        }
    };

    const handleDownload = async () => {
        if (!challenge.id) return;

        // Check if challenge has downloadable files
        const fileUrl = challenge.fileurl || challenge.downloadUrl;
        if (!fileUrl) {
            setResult({
                status: "warning",
                message: "This challenge doesn't have any downloadable files"
            });
            return;
        }

        setDownloading(true);
        setResult(null); // Clear any previous results

        try {
            // Use the API client for consistent authentication and error handling
            // The endpoint is /api/challenges/{id}/download, not the full URL
            await apiClient.downloadFile(
                `/api/challenges/${challenge.id}/download`,
                challenge.originalFilename || `${challenge.id}.zip`
            );

            // Success message
            setResult({
                status: "success",
                message: "Challenge files downloaded successfully!"
            });

        } catch (error: any) {
            console.error("Download error:", error);

            // User-friendly error messages based on error type
            let userMessage = error.message;
            const errorLower = error.message.toLowerCase();

            if (errorLower.includes("401") || errorLower.includes("unauthorized")) {
                userMessage = "Please log in to download challenge files.";
            } else if (errorLower.includes("403") || errorLower.includes("forbidden")) {
                userMessage = "You don't have permission to download these files.";
            } else if (errorLower.includes("404") || errorLower.includes("not found")) {
                userMessage = "Files not found for this challenge.";
            } else if (errorLower.includes("500") || errorLower.includes("server error")) {
                userMessage = "Server error. Please try again later.";
            } else if (errorLower.includes("network") || errorLower.includes("failed to fetch")) {
                userMessage = "Network error. Please check your connection.";
            } else if (errorLower.includes("timeout")) {
                userMessage = "Download timed out. Please try again.";
            }

            setResult({
                status: "error",
                message: userMessage,
            });
        } finally {
            setDownloading(false);
        }
    };

    const difficultyColors = {
        easy: "text-green-500 bg-green-500/10",
        medium: "text-yellow-500 bg-yellow-500/10",
        hard: "text-red-500 bg-red-500/10",
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setResult({
                status: "success",
                message: `${label} copied to clipboard!`
            });
        });
    };

    const hasDownload = hasDownloadableFiles(challenge);
    const showEnvironmentSection = requiresInstance(challenge);

    return (
        <div className="space-y-6">
            <Link
                href="/challenges"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Challenges
            </Link>

            <div className="bg-card p-6 md:p-8 rounded-lg border border-border shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
                    <div className="flex-1">
                        <h1 className="text-2xl md:text-3xl font-bold mb-3">{challenge.title}</h1>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <span
                                className={`text-sm font-semibold px-3 py-1 rounded-full ${
                                    difficultyColors[challenge.difficulty] || difficultyColors.easy
                                }`}
                            >
                                {challenge.difficulty.toUpperCase()}
                            </span>
                            <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full">
                                {challenge.category
                                    .split("-")
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ")}
                            </span>
                            {solved && (
                                <span className="text-sm px-3 py-1 bg-green-500/10 text-green-500 rounded-full">
                                    SOLVED 
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground">{challenge.description}</p>
                    </div>
                    <div className="lg:text-right">
                        <div className="text-3xl font-bold text-accent">
                            {challenge.points}
                        </div>
                        <div className="text-sm text-muted-foreground">points</div>
                        {solveStats && (
                            <div className="mt-2 text-sm">
                                <span className="text-muted-foreground">Solved by </span>
                                <span className="font-semibold">{solveStats.solveCount} users</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Results Display */}
                {result && (
                    <div
                        className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                            result.status === "success"
                                ? "bg-green-500/10 border border-green-500"
                                : result.status === "warning"
                                    ? "bg-yellow-500/10 border border-yellow-500"
                                    : result.status === "info"
                                        ? "bg-blue-500/10 border border-blue-500"
                                        : "bg-destructive/10 border border-destructive"
                        }`}
                    >
                        {result.status === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : result.status === "warning" ? (
                            <Info className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        ) : result.status === "info" ? (
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        )}
                        <p
                            className={`text-sm ${
                                result.status === "success"
                                    ? "text-green-500"
                                    : result.status === "warning"
                                        ? "text-yellow-500"
                                        : result.status === "info"
                                            ? "text-blue-500"
                                            : "text-destructive"
                            }`}
                        >
                            {result.message}
                        </p>
                    </div>
                )}

                {/* Download Section - Only show if challenge has files */}
                {hasDownload && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Challenge Files
                        </h2>
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            {downloading ? "Downloading..." : "Download Challenge File"}
                        </button>
                        <p className="text-sm text-muted-foreground mt-2">
                            Download the challenge files to get started
                        </p>
                    </div>
                )}

                {/* Terminal Environment Section - Only show if challenge requires instance */}
                {showEnvironmentSection && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Terminal className="w-5 h-5" />
                            Interactive Environment
                        </h2>

                        <div className="space-y-4">
                            {/* Control Buttons */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleLaunchTerminal}
                                    disabled={startingTerminal || (environment?.status === "RUNNING")}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                                        environment?.status === "RUNNING"
                                            ? "bg-green-600 text-white cursor-default"
                                            : "bg-green-600 hover:bg-green-700 text-white"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {startingTerminal ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Preparing environment...
                                        </>
                                    ) : environment?.status === "RUNNING" ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Environment Running
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Start Environment
                                        </>
                                    )}
                                </button>

                                {environment?.status === "RUNNING" && (
                                    <>
                                        <button
                                            onClick={() => setShowTerminal(!showTerminal)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            {showTerminal ? (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    Hide Terminal
                                                </>
                                            ) : (
                                                <>
                                                    <Terminal className="w-4 h-4" />
                                                    Open Terminal
                                                </>
                                            )}
                                        </button>

                                        <button
                                            onClick={handleStopTerminal}
                                            disabled={stoppingTerminal}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {stoppingTerminal ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Stopping...
                                                </>
                                            ) : (
                                                <>
                                                    <Square className="w-4 h-4" />
                                                    Stop Environment
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>

                            {startingTerminal && (
                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full w-1/3 animate-pulse" />
                                </div>
                            )}

                            {/* Environment Details */}
                            {environment && (
                                <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">Status:</span>
                                            <span className={`text-sm px-2 py-1 rounded ${
                                                environment.status === "RUNNING"
                                                    ? "bg-green-500/10 text-green-500"
                                                    : "bg-yellow-500/10 text-yellow-500"
                                            }`}>
                                                {environment.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">{timeRemaining}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* SSH Access */}
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Wifi className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">SSH Access</span>
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(`ssh user@localhost -p ${environment.sshPort}`, "SSH Command")}
                                                    className="text-xs text-primary hover:underline"
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                            <code className="text-xs bg-muted p-2 rounded block font-mono">
                                                ssh user@localhost -p {environment.sshPort}
                                            </code>
                                        </div>


                                    </div>

                                    <div className="text-xs text-muted-foreground pt-2 border-t">
                                        Instance ID: {environment.instanceId}
                                    </div>
                                </div>
                            )}

                            {!environment && (
                                <p className="text-sm text-muted-foreground">
                                    Start an environment to get SSH access and solve the challenge.
                                </p>
                            )}
                        </div>
                    </div>
                )}


                {/* Hints Section */}
                {challenge.hints && challenge.hints.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            Hints ({challenge.hints.length})
                        </h2>

                        <div className="space-y-4">
                            {challenge.hints.map((hint, index) => {
                                const penalties = [10, 20, 25];
                                const penalty = penalties[index] ?? 0;
                                const isRevealed = index in revealedHints;
                                const prevRevealed = index === 0 || (index - 1) in revealedHints;
                                const isLocked = !isRevealed && prevRevealed && !!hintCountdown;
                                const isAvailable = !isRevealed && prevRevealed && !hintCountdown;
                                const isBlocked = !isRevealed && !prevRevealed;
                                const hintText = isRevealed ? revealedHints[index] : (solved ? hint : null);

                                return (
                                    <div key={index} className="rounded-lg border border-primary/20 overflow-hidden">
                                        <div className="p-4 bg-primary/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium">Hint {index + 1}</span>
                                                {!solved && <span className="text-xs text-yellow-500">-{penalty}%</span>}
                                            </div>

                                            {solved ? (
                                                <span className="text-xs text-muted-foreground">Solved</span>
                                            ) : (
                                                <>
                                                    {isRevealed && (
                                                        <span className="text-xs text-green-500">Revealed</span>
                                                    )}
                                                    {isLocked && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {hintCountdown}
                                                        </span>
                                                    )}
                                                    {isAvailable && (
                                                        <button
                                                            onClick={() => handleRevealHint(index)}
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            Reveal (-{penalty}%)
                                                        </button>
                                                    )}
                                                    {isBlocked && (
                                                        <span className="text-xs text-muted-foreground">Locked</span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {hintText && (
                                            <div className="p-4 bg-primary/10 border-t border-primary/20">
                                                <p className="text-sm text-primary/90">{hintText}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


                {/* Info message if no download or environment */}
                {!hasDownload && !showEnvironmentSection && (
                    <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-blue-500 mb-1">No Additional Files or Environment Needed</h3>
                                <p className="text-sm text-blue-600/80">
                                    This challenge doesn&apos;t require any downloadable files or a separate environment.
                                    Use your existing tools and knowledge to analyze and solve the challenge.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Flag Submission Section */}
                {!solved && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Flag className="w-5 h-5" />
                            Submit Flag
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        id="flag"
                                        value={flag}
                                        onChange={(e) => setFlag(e.target.value)}
                                        placeholder="flag{...}"
                                        className={`flex-1 px-4 py-2.5 bg-background border rounded-lg focus:outline-none font-mono placeholder:text-muted-foreground ${
                                            result?.status === "success"
                                                ? "border-green-500 text-green-600 focus:ring-2 focus:ring-green-500"
                                                : "border-border focus:ring-2 focus:ring-primary"
                                        }`}
                                        required
                                        disabled={submitting}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !flag.trim()}
                                        className="sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <Flag className="w-4 h-4" />
                                                Submit Flag
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Enter the flag you found in the format: flag{`{`}your_flag_here{`}`}
                                </p>
                            </div>
                        </form>
                    </div>
                )}

                {solved && (
                    <div className="p-4 bg-green-500/10 border border-green-500 rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div>
                            <p className="text-green-500 font-semibold">Challenge Solved!</p>
                            <p className="text-sm text-green-600/80 mt-1">
                                You earned {pointsEarned ?? challenge.points} points for solving this challenge.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* KaliTerminal Modal */}
            {showTerminal && environment && environment.status === "RUNNING" && (
                <KaliTerminal
                    instanceId={environment.instanceId}
                    sshPort={environment.sshPort}
                    containerName={environment.containerName || ""}
                    onClose={() => setShowTerminal(false)}
                />
            )}
        </div>
    );
}