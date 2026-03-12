'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { getAllChallenges } from '@/lib/api/challenges'
import ChallengeList from '@/components/challenge-list'
import type { Challenge } from '@/lib/types'
import { Loader2, AlertCircle } from 'lucide-react'

export default function ChallengesPage() {
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !auth.isAuthenticated) {
      // Ensure we never stay stuck in loading when user is unauthenticated.
      setLoading(false)
      router.push('/login')
    }
  }, [auth.isAuthenticated, authLoading, router])

  // Fetch challenges
  useEffect(() => {
    if (auth.isAuthenticated) {
      setLoading(true)
      setError(null)
      getAllChallenges()
        .then(setChallenges)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [auth.isAuthenticated])

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading challenges...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="p-6 bg-destructive/10 border border-destructive rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-destructive mb-1">Error Loading Challenges</h3>
                <p className="text-sm text-destructive/90">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Make sure the backend is running on port 8080.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!auth.isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Challenges</h1>
          <p className="text-muted-foreground">Test your skills across multiple categories</p>
        </div>

        <ChallengeList challenges={challenges} />
      </div>  
    </div>
  )
}
