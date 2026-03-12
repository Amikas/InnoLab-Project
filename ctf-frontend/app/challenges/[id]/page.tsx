'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { getChallenge } from '@/lib/api/challenges'
import { getChallengeStatistics, checkIfSolved } from '@/lib/api/solves'
import ChallengeDetail from '@/components/challenge-detail'
import type { Challenge } from '@/lib/types'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ChallengePage() { 
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams() // ← Use useParams hook instead
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [solveStats, setSolveStats] = useState<{ solveCount: number; solvedByUser: boolean } | null>(null)

  const challengeId = params.id as string // ← Get ID directly from params

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !auth.isAuthenticated) {
      // Stop loading before redirect so the page cannot spin forever.
      setLoading(false)
      router.push('/login')
    }
  }, [auth.isAuthenticated, authLoading, router])
    // Fetch challenge and solve statistics
    useEffect(() => {
        if (auth.isAuthenticated && challengeId) {
            setLoading(true)
            setError(null)

            Promise.all([
                getChallenge(challengeId),
                getChallengeStatistics(challengeId),
                checkIfSolved(challengeId)
            ])
                .then(([challengeData, statsData, solvedData]) => {
                    console.log(' Stats Data:', statsData) // ADD THIS
                    setChallenge(challengeData)

                    // Handle stats data safely with proper error checking
                    let stats = null
                    let solved = false

                    if (statsData && statsData.success && statsData.data) {
                        stats = statsData.data
                        console.log(' Stats extracted:', stats) // ADD THIS
                    } else if (statsData && !statsData.success) {
                        console.warn('Challenge statistics failed:', statsData.error)
                    }

                    if (solvedData && solvedData.success && solvedData.data) {
                        solved = solvedData.data.solved || false
                    } else if (solvedData && !solvedData.success) {
                        console.warn('Solve check failed:', solvedData.error)
                    }

                    const newSolveStats = {
                        solveCount: stats?.solveCount || 0,
                        solvedByUser: solved
                    }
                    console.log(' Setting solve stats:', newSolveStats) // ADD THIS

                    setSolveStats(newSolveStats)
                })
                .catch((err) => {
                    console.error('Error fetching challenge data:', err)
                    setError(err.message)
                    setSolveStats({
                        solveCount: 0,
                        solvedByUser: false
                    })
                })
                .finally(() => setLoading(false))
        }
    }, [auth.isAuthenticated, challengeId])


  // Fetch challenge and solve statistics
  useEffect(() => {
    if (auth.isAuthenticated && challengeId) {
      setLoading(true)
      setError(null)
      
      Promise.all([
        getChallenge(challengeId),
        getChallengeStatistics(challengeId),
        checkIfSolved(challengeId)
      ])
      .then(([challengeData, statsData, solvedData]) => {
        setChallenge(challengeData)
        
        // Handle stats data safely with proper error checking
        let stats = null
        let solved = false
        
        if (statsData && statsData.success && statsData.data) {
          stats = statsData.data
        } else if (statsData && !statsData.success) {
          console.warn('Challenge statistics failed:', statsData.error)
        }
        
        if (solvedData && solvedData.success && solvedData.data) {
          solved = solvedData.data.solved || false
        } else if (solvedData && !solvedData.success) {
          console.warn('Solve check failed:', solvedData.error)
        }
        
        setSolveStats({
          solveCount: stats?.solveCount || 0,
          solvedByUser: solved
        })
      })
      .catch((err) => {
        console.error('Error fetching challenge data:', err)
        setError(err.message)
        // Set default solve stats on error
        setSolveStats({
          solveCount: 0,
          solvedByUser: false
        })
      })
      .finally(() => setLoading(false))
    }
  }, [auth.isAuthenticated, challengeId]) 

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading challenge...</p>
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
                <h3 className="font-semibold text-destructive mb-1">Error Loading Challenge</h3>
                <p className="text-sm text-destructive/90">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Challenge not found
  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Challenge Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The challenge you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/challenges"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Challenges
          </Link>
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
      <div className="max-w-4xl mx-auto">
        <ChallengeDetail challenge={challenge} solveStats={solveStats} setSolveStats={setSolveStats} />
      </div>
    </div>
  )
}
