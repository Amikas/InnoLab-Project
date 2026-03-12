'use client'
import { useState, useEffect, createContext, useContext } from 'react'
import { apiClient } from '@/lib/api/client'
import type { AuthState, LoginCredentials, ApiResult } from '@/lib/types'

// Update your types to include isAdmin
interface UserInfo {
  username: string;
  status: string;
  isAdmin: boolean;
}

interface LoginResponse {
  status: string;
  message: string;
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  auth: AuthState
  login: (credentials: LoginCredentials) => Promise<ApiResult>
  logout: () => Promise<void>
  isLoading: boolean
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
    isAuthenticated: false,
    isAdmin: false, // Add isAdmin to auth state
  })
  const [isLoading, setIsLoading] = useState(true)

  // Note: Removed cookie clearing on app startup as it was causing authentication issues
  // by deleting the auth_token cookie immediately after login

  const checkAuth = async () => {
    try {
      // Backend response is the source of truth for auth state.
      const userInfo = await apiClient.get<UserInfo>('/api/user/me')
      if (userInfo.status === 'success') {
        setAuth({
          token: 'http-only-cookie',
          user: userInfo.username,
          isAuthenticated: true,
          isAdmin: userInfo.isAdmin || false, // Add admin status
        })
      } else {
        throw new Error('Not authenticated')
      }
    } catch (error) {
      // Best effort cleanup: clear stale/expired cookie on backend side.
      // This prevents "cookie exists but session is invalid" loops.
      try {
        await apiClient.post('/api/logout', {})
      } catch {
        // Ignore cleanup failures to keep auth check resilient.
      }

      setAuth({
        token: null,
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      })
    }
  }

  useEffect(() => {
    checkAuth().finally(() => setIsLoading(false))
  }, [])

  const login = async (credentials: LoginCredentials): Promise<ApiResult> => {
    setIsLoading(true)
    try {
      const response = await apiClient.post<LoginResponse>('/api/login', {
        username: credentials.username,
        password: credentials.password,
      })

      if (response.status === 'success') {
        // Update auth state with admin information
        setAuth({
          token: 'http-only-cookie',
          user: response.username,
          isAuthenticated: true,
          isAdmin: response.isAdmin || false,
        })
        return { success: true, data: response }
      }

      return { success: false, error: 'Login failed' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.post('/api/logout', {})
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setAuth({
        token: null,
        user: null,
        isAuthenticated: false,
        isAdmin: false,
      })
    }
  }

  const value = {
    auth,
    login,
    logout,
    isLoading,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
