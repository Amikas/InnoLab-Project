// Core type definitions for the CTF platform

export interface User {
    id: string
    username: string
    email: string
    score: number
    solvedChallenges: number
    createdAt: Date
    isAdmin: boolean
}

export interface Challenge {
    id: string
    title: string
    titleDe?: string
    description: string
    descriptionDe?: string
    category: "binary-exploitation" | "cryptography" | "forensics" | "reverse-engineering" | "web-exploitation"
    difficulty: "easy" | "medium" | "hard"
    points: number
    solved: boolean
    // Backend returns 'downloadUrl', but frontend expects 'fileurl'
    // We'll make both optional and handle the mapping
    fileurl?: string
    downloadUrl?: string  // From backend
    flag?: string
    hints?: string[]
    hintsDe?: string[]
    files?: { name: string; url: string }[]

    // NEW FIELDS for instance-based challenges (from backend)
    dockerImageName?: string
    requiresInstance?: boolean
    // Optional: instance ID if user has a running instance
    instanceId?: string
}

// Helper function to get the file URL regardless of field name
export function getChallengeFileUrl(challenge: Challenge): string | undefined {
    return challenge.fileurl || challenge.downloadUrl;
}

// Helper function to check if challenge has downloadable files
export function hasDownloadableFiles(challenge: Challenge): boolean {
    const url = getChallengeFileUrl(challenge);
    return !!url && url.length > 0;
}

// Helper function to check if challenge requires instance
export function requiresInstance(challenge: Challenge): boolean {
    return challenge.requiresInstance === true;
}

export interface ScoreboardEntry {
    id: string
    username: string
    score: number
    solvedChallenges: number
}

export interface AuthResult {
    success: boolean
    error?: string
    user?: User
}

export interface FlagSubmissionResult {
    success: boolean
    message: string
    points?: number
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    status: string;
    message: string;
}

export interface AuthState {
    token: string | null;
    user: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean
}

export interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface CreateChallengeData {
    title: string
    titleDe?: string
    description: string
    descriptionDe?: string
    category: string
    difficulty: string
    points: number
    flag?: string
    file: File
    dockerImageName?: string
    requiresInstance?: boolean
    hints?: string[]
}

// Environment types for instance-based challenges
export interface EnvironmentInstance {
    instanceId: string
    sshPort: number
    vscodePort?: number
    desktopPort?: number
    expiresAt: string
    status: string
    containerName?: string
    message?: string
}

// Category type for filtering
export interface Category {
    id: string
    name: string
    description: string
    challengeCount: number
}