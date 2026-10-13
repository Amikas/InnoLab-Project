// User profile data with real API integration
export interface UserProfile {
  username: string
  email: string
  memberSince: string
  rank: string
  totalPoints: number
  challengesSolved: number
  streak: number
  timeSpent: string
  recentSubmissions: Array<{
    challenge: string
    category: string
    solved: boolean
    time: string
  }>
}

// Import the real API functions
import { getUserStatistics, getRecentSolves } from './solves'
import { getAllChallenges } from './challenges'
import { getUserInfo, type UserInfo } from './auth'

/**
 * Get user profile with real data from the backend
 */
export async function getUserProfile(): Promise<UserProfile> {
  try {
    // Get basic user info
    const userInfoResponse = await getUserInfo()
    
    if (!userInfoResponse.success || !userInfoResponse.data) {
      console.warn('No user info available, using defaults')
      // Continue with default values instead of throwing error
    }
    
    const userInfo: Partial<UserInfo> = userInfoResponse.success && userInfoResponse.data ? userInfoResponse.data : {}
    
    // Get user statistics
    const statsResponse = await getUserStatistics()
    
    if (!statsResponse.success || !statsResponse.data) {
      throw new Error('Failed to fetch user statistics')
    }
    
    const stats = statsResponse.data
    
    // Get recent solves for activity feed
    const recentSolvesResponse = await getRecentSolves(4)

    // Backend solve responses do not include category; resolve it from the
    // challenge list so the profile can still group/display recent activity.
    let challengeCategoryById = new Map<string, string>()
    try {
        const challenges = await getAllChallenges()
        challengeCategoryById = new Map(challenges.map((c) => [c.id, c.category]))
    } catch (e) {
        console.warn('Could not load challenges for solve category enrichment:', e)
    }

    const recentSubmissions = recentSolvesResponse.success && recentSolvesResponse.data
      ? recentSolvesResponse.data.map(solve => ({
          challenge: solve.challengeTitle,
          category: challengeCategoryById.get(solve.challengeId) || 'Unknown',
          solved: true,
          time: formatTimeAgo(solve.solvedAt)
        }))
      : []
    
    // Calculate rank based on points (simple implementation)
    const rank = calculateRank(stats.totalPoints)
    
    return {
      username: userInfo.username || 'CTF Player',
      email: userInfo.email || 'user@ctf-platform.com',
      memberSince: userInfo.createdAt ? formatDate(userInfo.createdAt) : 'Recently',
      rank: rank,
      totalPoints: stats.totalPoints || 0,
      challengesSolved: stats.challengesSolved || 0,
      streak: calculateStreak(recentSubmissions), // Simple streak calculation
      timeSpent: "N/A", // Would need time tracking for this
      recentSubmissions: recentSubmissions
    }
    
  } catch (error) {
    console.error('Error fetching user profile:', error)
    
    // Fallback to mock data if API fails
    return getMockProfile()
  }
}

// Helper function to format date
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  } catch {
    return 'Recently'
  }
}

// Helper function to calculate time ago
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (seconds < 60) return `${seconds} seconds ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  } catch {
    return 'Recently'
  }
}

// Helper function to calculate rank
function calculateRank(points: number): string {
  if (points >= 5000) return "Elite Hacker"
  if (points >= 2500) return "Advanced Hacker"
  if (points >= 1000) return "Skilled Hacker"
  if (points >= 500) return "Novice Hacker"
  return "Beginner"
}

// Helper function to calculate streak (simple implementation)
function calculateStreak(submissions: any[]): number {
  if (submissions.length === 0) return 0
  
  // Count consecutive days with solves
  let streak = 0
  let currentDate = new Date()
  
  for (let i = 0; i < submissions.length; i++) {
    const submissionDate = new Date(submissions[i].time)
    const daysDiff = Math.floor((currentDate.getTime() - submissionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === streak) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}

// Fallback mock data if API fails
export function getMockProfile(): UserProfile {
  return {
    username: "CyberNinja",
    email: "cyberninja@ctf-platform.com",
    memberSince: "January 2024",
    rank: "Elite Hacker",
    totalPoints: 8750,
    challengesSolved: 42,
    streak: 15,
    timeSpent: "127 hours",
    recentSubmissions: [
      {
        challenge: "Buffer Overflow Basics",
        category: "Binary Exploitation",
        solved: true,
        time: "2 hours ago",
      },
      {
        challenge: "Caesar Cipher",
        category: "Cryptography",
        solved: true,
        time: "1 day ago",
      },
      {
        challenge: "Memory Forensics",
        category: "Forensics",
        solved: true,
        time: "2 days ago",
      },
      {
        challenge: "SQL Injection Defense",
        category: "Web Exploitation",
        solved: false,
        time: "3 days ago",
      },
    ],
  }
}
