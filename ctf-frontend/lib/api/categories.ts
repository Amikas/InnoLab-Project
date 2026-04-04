import { apiClient } from './client'

export interface Category {
  id: string
  name: string
  summary: string
  fileUrl: string
}

// Fetch all categories from backend
export async function getAllCategories(): Promise<Category[]> {
  try {
    const response = await apiClient.get<Category[]>('/api/categories')
    return response
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return []
  }
}

// Get category by ID
export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const categories = await getAllCategories()
    return categories.find((c) => c.id === id) || null
  } catch (error) {
    console.error('Failed to fetch category:', error)
    return null
  }
}

// Get category by frontend category name
export async function getCategoryByFrontendName(frontendCategory: string): Promise<Category | null> {
  try {
    return await getCategoryById(frontendCategory)
  } catch (error) {
    console.error('Failed to fetch category by frontend name:', error)
    return null
  }
}

