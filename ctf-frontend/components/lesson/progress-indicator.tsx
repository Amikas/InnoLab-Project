'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LessonProgress {
  lessonId: number
  completed: boolean
}

interface ModuleProgress {
  moduleId: number
  lessons: LessonProgress[]
}

interface ProgressIndicatorProps {
  currentLessonId: number
  totalLessons: number
  completedLessons: number // placeholder for now
  modules?: ModuleProgress[] // placeholder for now
  className?: string
}

// Format duration helper
function formatDuration(minutes: number | null): string {
  if (!minutes) return 'Self-paced'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function ProgressIndicator({
  currentLessonId,
  totalLessons,
  completedLessons = 0, // placeholder for now
  modules, // placeholder for now
  className,
}: ProgressIndicatorProps) {
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const isComplete = progress === 100

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            {isComplete ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
            {completedLessons} of {totalLessons} lessons
          </span>
          <span className={cn('font-medium', isComplete ? 'text-green-500' : 'text-foreground')}>
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-500 ease-out rounded-full',
              isComplete ? 'bg-green-500' : 'bg-primary'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Compact progress indicator (alternative display) */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: Math.min(totalLessons, 12) }).map((_, i) => {
          const isCompleted = i < (completedLessons || 0)
          const isCurrent = i === currentLessonId - 1
          return (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isCompleted 
                  ? 'bg-green-500' 
                  : isCurrent 
                    ? 'bg-primary' 
                    : 'bg-muted'
              )}
              title={`Lesson ${i + 1}${isCompleted ? ' (completed)' : ''}`}
            />
          )
        })}
        {totalLessons > 12 && (
          <span className="text-xs text-muted-foreground">+{totalLessons - 12}</span>
        )}
      </div>
    </div>
  )
}

// Compact badge version for inline display
interface ProgressBadgeProps {
  current: number
  total: number
  className?: string
}

export function ProgressBadge({ current, total, className }: ProgressBadgeProps) {
  const progress = total > 0 ? Math.round((current / total) * 100) : 0
  
  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50', className)}>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {current}/{total}
      </span>
    </div>
  )
}

export { formatDuration }