import { apiClient } from './client'

export interface Lesson {
  id: number
  title: string
  titleDe?: string | null
  content: string
  contentDe?: string | null
  detailedExplanation: string | null
  detailedExplanationDe?: string | null
  videoUrl: string | null
  orderIndex: number
  challengeIds: string[]
  codeExamplesJson: string[]
  realWorldIncidents: string[]
  realWorldIncidentsDe?: string[]
  externalReferences: string[]
  keyTakeaways: string[]
  keyTakeawaysDe?: string[]
}

export interface Module {
  id: number
  title: string
  titleDe?: string | null
  content: string | null
  contentDe?: string | null
  orderIndex: number
  lessons: Lesson[]
}

export interface Course {
  id: number
  title: string
  titleDe?: string | null
  description: string | null
  descriptionDe?: string | null
  slug: string
  difficulty: string | null
  estimatedMinutes: number | null
  orderIndex: number
  modules: Module[]
}

export interface CourseListItem {
  id: number
  title: string
  titleDe?: string | null
  description: string | null
  descriptionDe?: string | null
  slug: string
  difficulty: string | null
  estimatedMinutes: number | null
  moduleCount: number
  lessonCount: number
}

export async function getAllCourses(): Promise<CourseListItem[]> {
  try {
    const response = await apiClient.get<CourseListItem[]>('/api/courses')
    return response
  } catch (error) {
    console.error('Failed to fetch courses:', error)
    return []
  }
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  try {
    const response = await apiClient.get<Course>(`/api/courses/${slug}`)
    return response
  } catch (error) {
    console.error(`Failed to fetch course ${slug}:`, error)
    return null
  }
}
