import { apiClient } from './client';

export interface AdminStats {
    totalChallenges: number
    totalUsers: number | string
    totalSubmissions: number | string
    activeChallenges: number
    challengesByCategory: Array<{ category: string; count: number }>
    challengesByDifficulty: Array<{ difficulty: string; count: number }>
}

export async function getAdminStats(): Promise<AdminStats> {
    try {
        const backendStats = await apiClient.get('/api/challenges/admin/stats');

        return {
            totalChallenges: typeof backendStats.totalChallenges === 'number' ? backendStats.totalChallenges : 0,
            totalUsers: typeof backendStats.totalUsers === 'number' ? backendStats.totalUsers : "N/A",
            totalSubmissions: typeof backendStats.totalSubmissions === 'number' ? backendStats.totalSubmissions : "N/A",
            activeChallenges: typeof backendStats.activeChallenges === 'number' ? backendStats.activeChallenges : 0,
            challengesByCategory: Array.isArray(backendStats.challengesByCategory)
                ? backendStats.challengesByCategory.map((cat: any) => ({
                    category: String(cat.category || ''),
                    count: typeof cat.count === 'number' ? cat.count : 0
                }))
                : [],
            challengesByDifficulty: Array.isArray(backendStats.challengesByDifficulty)
                ? backendStats.challengesByDifficulty.map((diff: any) => ({
                    difficulty: String(diff.difficulty || ''),
                    count: typeof diff.count === 'number' ? diff.count : 0
                }))
                : [],
        };
    } catch (error) {
        console.error('Failed to fetch admin stats:', error);
        throw error;
    }
}

// Add the missing createChallenge function
export async function createChallenge(formData: FormData): Promise<any> {
    try {
        // Reuse the shared API client so credentials + CSRF handling stay consistent.
        return await apiClient.request('/api/challenges', {
            method: 'POST',
            body: formData,
        });
    } catch (error) {
        console.error('Network error creating challenge:', error);
        throw error;
    }
}

// You might also want to add other admin functions here:
export async function deleteChallenge(id: string): Promise<void> {
    return apiClient.delete(`/api/challenges/${id}`);
}

export async function updateChallenge(id: string, data: any): Promise<any> {
    return apiClient.put(`/api/challenges/${id}`, data);
}

export async function getAllUsers(): Promise<any[]> {
    return apiClient.get('/api/admin/users');
}
