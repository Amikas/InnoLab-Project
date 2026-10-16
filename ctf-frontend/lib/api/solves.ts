// API functions for solve tracking
import { apiClient } from './client'
import type { ApiResult } from '@/lib/types'

export interface Solve {
    id: number
    username: string
    challengeId: string
    challengeTitle: string
    pointsEarned: number
    solvedAt: string
}

export interface SolveStatistics {
    totalSolves: number
    totalPoints: number
    categoryDistribution: Record<string, number>
    difficultyDistribution: Record<string, number>
    challengesSolved: number
}

export interface ChallengeStatistics {
    challengeId: string
    challengeTitle: string
    solveCount: number
    category: string
    difficulty: string
    points: number
    solveRate: string
}

export interface LeaderboardEntry {
    username: string
    solveCount: number
}

function clampLimit(limit: number): number {
    const n = Number.isFinite(limit) ? Math.trunc(limit) : 10
    return Math.min(100, Math.max(1, n))
}

export async function getMySolves(): Promise<ApiResult<Solve[]>> {
    try {
        const response = await apiClient.get<Solve[]>('/api/solves/me')
        return { success: true, data: Array.isArray(response) ? response : [] }
    } catch (error) {
        console.error('Error fetching user solves:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch solves' }
    }
}

export async function checkIfSolved(challengeId: string): Promise<ApiResult<{ solved: boolean }>> {
    try {
        const response = await apiClient.get<{ solved: boolean }>(`/api/solves/check/${challengeId}`)
        return { success: true, data: response && typeof response.solved === 'boolean' ? response : { solved: false } }
    } catch (error) {
        console.error('Error checking solve status:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to check solve status' }
    }
}

export async function getSolveCountForChallenge(challengeId: string): Promise<ApiResult<{ count: number }>> {
    try {
        const response = await apiClient.get<{ count: number }>(`/api/solves/challenge/${challengeId}/count`)
        return { success: true, data: response && typeof response.count === 'number' ? response : { count: 0 } }
    } catch (error) {
        console.error('Error fetching solve count:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch solve count' }
    }
}

export async function getRecentSolves(limit: number = 10): Promise<ApiResult<Solve[]>> {
    try {
        const response = await apiClient.get<Solve[]>(`/api/solves/recent?limit=${clampLimit(limit)}`)
        return { success: true, data: Array.isArray(response) ? response : [] }
    } catch (error) {
        console.error('Error fetching recent solves:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch recent solves' }
    }
}

export async function getTopSolvers(limit: number = 10): Promise<ApiResult<LeaderboardEntry[]>> {
    try {
        const response = await apiClient.get<Record<string, number>>(`/api/solves/top-solvers?limit=${clampLimit(limit)}`)
        const entries = Object.entries(response ?? {}).map(([username, solveCount]) => ({ username, solveCount: Number(solveCount) || 0 }))
        entries.sort((a, b) => b.solveCount - a.solveCount || a.username.localeCompare(b.username))
        return { success: true, data: entries }
    } catch (error) {
        console.error('Error fetching top solvers:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch top solvers' }
    }
}

export async function getMostSolvedChallenges(limit: number = 10): Promise<ApiResult<{ challengeId: string; solveCount: number }[]>> {
    try {
        const response = await apiClient.get<Record<string, number>>(`/api/solves/most-solved?limit=${clampLimit(limit)}`)
        return { success: true, data: Object.entries(response ?? {}).map(([challengeId, solveCount]) => ({ challengeId, solveCount: Number(solveCount) || 0 })) }
    } catch (error) {
        console.error('Error fetching most solved challenges:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch most solved challenges' }
    }
}

export async function getUserStatistics(): Promise<ApiResult<SolveStatistics>> {
    try {
        const response = await apiClient.get<Record<string, unknown>>('/api/solves/me/stats')
        const data = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>
        return {
            success: true,
            data: {
                totalSolves: Number(data.totalSolves) || 0,
                totalPoints: Number(data.totalPoints) || 0,
                categoryDistribution: (data.categoryDistribution && typeof data.categoryDistribution === 'object' ? data.categoryDistribution as Record<string, number> : {}),
                difficultyDistribution: (data.difficultyDistribution && typeof data.difficultyDistribution === 'object' ? data.difficultyDistribution as Record<string, number> : {}),
                challengesSolved: Number(data.totalSolves) || 0
            }
        }
    } catch (error) {
        console.error('Error fetching user statistics:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch user statistics' }
    }
}

export async function getChallengeStatistics(challengeId: string): Promise<ApiResult<ChallengeStatistics>> {
    try {
        const response = await apiClient.get<Record<string, unknown>>(`/api/solves/challenge/${challengeId}/stats`)
        const data = (response && typeof response === 'object' ? response : {}) as Record<string, unknown>
        return {
            success: true,
            data: {
                challengeId: String(data.challengeId ?? challengeId),
                challengeTitle: String(data.challengeTitle ?? ''),
                solveCount: Number(data.solveCount) || 0,
                category: String(data.category ?? ''),
                difficulty: String(data.difficulty ?? ''),
                points: Number(data.points) || 0,
                solveRate: String(data.solveRate ?? 'N/A')
            }
        }
    } catch (error) {
        console.error('Error fetching challenge statistics:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch challenge statistics' }
    }
}

export async function getTotalSolveCount(): Promise<ApiResult<{ totalSolves: number }>> {
    try {
        const response = await apiClient.get<{ totalSolves: number }>('/api/solves/total-count')
        return { success: true, data: response && typeof response.totalSolves === 'number' ? response : { totalSolves: 0 } }
    } catch (error) {
        console.error('Error fetching total solve count:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch total solve count' }
    }
}
