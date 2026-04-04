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

// Course Admin APIs
export interface CourseAdmin {
    id: number;
    title: string;
    description: string;
    slug: string;
    difficulty: string | null;
    estimatedMinutes: number | null;
    orderIndex: number;
    isPublished: boolean;
}

export interface ModuleAdmin {
    id: number;
    courseId: number;
    title: string;
    content: string | null;
    orderIndex: number;
}

export interface LessonAdmin {
    id: number;
    moduleId: number;
    title: string;
    content: string;
    detailedExplanation: string | null;
    videoUrl: string | null;
    orderIndex: number;
    challengeIds: string[];
    codeExamplesJson: string[];
    realWorldIncidents: string[];
    externalReferences: string[];
}

export async function getAllCoursesAdmin(): Promise<CourseAdmin[]> {
    return apiClient.get('/api/admin/courses');
}

export async function getCourseAdmin(id: number): Promise<CourseAdmin> {
    return apiClient.get(`/api/admin/courses/${id}`);
}

export async function createCourse(data: Partial<CourseAdmin>): Promise<CourseAdmin> {
    return apiClient.post('/api/admin/courses', data);
}

export async function updateCourse(id: number, data: Partial<CourseAdmin>): Promise<CourseAdmin> {
    return apiClient.put(`/api/admin/courses/${id}`, data);
}

export async function deleteCourse(id: number): Promise<void> {
    return apiClient.delete(`/api/admin/courses/${id}`);
}

export async function publishCourse(id: number, published: boolean): Promise<CourseAdmin> {
    return apiClient.put(`/api/admin/courses/${id}/publish`, { published });
}

export async function getAllModulesAdmin(): Promise<ModuleAdmin[]> {
    return apiClient.get('/api/admin/modules');
}

export async function getModulesByCourseAdmin(courseId: number): Promise<ModuleAdmin[]> {
    return apiClient.get(`/api/admin/modules/course/${courseId}`);
}

export async function createModule(data: Partial<ModuleAdmin>): Promise<ModuleAdmin> {
    return apiClient.post('/api/admin/modules', data);
}

export async function updateModule(id: number, data: Partial<ModuleAdmin>): Promise<ModuleAdmin> {
    return apiClient.put(`/api/admin/modules/${id}`, data);
}

export async function deleteModule(id: number): Promise<void> {
    return apiClient.delete(`/api/admin/modules/${id}`);
}

export async function getAllLessonsAdmin(): Promise<LessonAdmin[]> {
    return apiClient.get('/api/admin/lessons');
}

export async function getLessonAdmin(id: number): Promise<LessonAdmin> {
    return apiClient.get(`/api/admin/lessons/${id}`);
}

export async function getLessonsByModuleAdmin(moduleId: number): Promise<LessonAdmin[]> {
    return apiClient.get(`/api/admin/lessons/module/${moduleId}`);
}

export async function createLesson(data: Partial<LessonAdmin>): Promise<LessonAdmin> {
    return apiClient.post('/api/admin/lessons', data);
}

export async function updateLesson(id: number, data: Partial<LessonAdmin>): Promise<LessonAdmin> {
    return apiClient.put(`/api/admin/lessons/${id}`, data);
}

export async function deleteLesson(id: number): Promise<void> {
    return apiClient.delete(`/api/admin/lessons/${id}`);
}
