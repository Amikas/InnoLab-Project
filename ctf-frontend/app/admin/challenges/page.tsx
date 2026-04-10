"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic"
import { getAllChallenges } from "@/lib/api/challenges"
const ChallengeTable = dynamic(() => import("@/components/admin/challenge-table"), { ssr: false })
const AddChallengeForm = dynamic(() => import("@/components/admin/add-challenge-form"), { ssr: false })
import type { Challenge } from "@/lib/types"

export default function AdminChallengesPage() {
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) {
      router.push('/')
    }
  }, [auth, authLoading, router])

  useEffect(() => {
    // Only load challenges if user is authenticated and admin
    if (!auth.isAuthenticated || !auth.isAdmin) {
      setIsLoading(false)
      return
    }

    const loadChallenges = async () => {
      try {
        const data = await getAllChallenges()
        setChallenges(data)
      } catch (error) {
        console.error('Failed to load challenges:', error)
        setChallenges([])
      } finally {
        setIsLoading(false)
      }
    }

    loadChallenges()
  }, [auth.isAuthenticated, auth.isAdmin])

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  // Don't render anything if not admin (will redirect in useEffect)
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center">
            <p className="text-foreground">Loading challenges...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Manage Challenges</h1>
            <p className="text-muted-foreground">
              Welcome, {auth.user}! Create, edit, and delete CTF challenges
            </p>
          </div>
        </div>

        {/* Add Challenge Form */}
        <div className="mb-12">
          <AddChallengeForm />
        </div>

        {/* Challenge Table */}
        <ChallengeTable challenges={challenges} />
      </div>
    </div>
  )
}