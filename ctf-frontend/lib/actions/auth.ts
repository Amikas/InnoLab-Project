'use server'

import { apiClient } from '@/lib/api/client'
import { logger } from '@/lib/logger'
import type { LoginCredentials, ApiResult } from '@/lib/types'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function loginUser(formData: FormData): Promise<ApiResult> {
  try {
    const credentials: LoginCredentials = {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
    }

    const response = await apiClient.post<{ 
      status: string; 
      message: string; 
      username: string 
    }>('/api/login', credentials)

    return {
      success: true,
      data: response
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed. Please check your credentials.'
    }
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await apiClient.post('/api/logout')
  } catch (error) {
    // Use the project logger; it redacts known sensitive keys in
    // production and is captured by Next.js server-side observability.
    logger.warn('Logout failed', {
      reason: error instanceof Error ? error.name : 'unknown',
    })
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has('auth_token')
}

export async function requireAuth() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect('/login')
  }
}