import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LessonNavProps {
  prevLesson?: {
    id: number
    title: string
    slug: string
  } | null
  nextLesson?: {
    id: number
    title: string
    slug: string
  } | null
  courseSlug: string
  className?: string
}

export function LessonNav({ prevLesson, nextLesson, courseSlug, className }: LessonNavProps) {
  return (
    <nav className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>
      {/* Previous Lesson */}
      {prevLesson ? (
        <Link
          href={`/courses/${courseSlug}/lesson/${prevLesson.id}`}
          className={cn(
            'group flex items-start gap-4 p-4 rounded-lg border border-border',
            'hover:border-primary/50 hover:bg-muted/30 transition-all',
            'text-left'
          )}
        >
          <div className="shrink-0 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Previous
            </span>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {prevLesson.title}
            </p>
          </div>
        </Link>
      ) : (
        <Link
          href={`/courses/${courseSlug}`}
          className={cn(
            'group flex items-center gap-4 p-4 rounded-lg border border-border',
            'hover:border-primary/50 hover:bg-muted/30 transition-all'
          )}
        >
          <div className="shrink-0 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Back to
            </span>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              Course Overview
            </p>
          </div>
        </Link>
      )}

      {/* Next Lesson */}
      {nextLesson ? (
        <Link
          href={`/courses/${courseSlug}/lesson/${nextLesson.id}`}
          className={cn(
            'group flex items-start gap-4 p-4 rounded-lg border border-border',
            'hover:border-primary/50 hover:bg-muted/30 transition-all',
            'text-right sm:col-start-2'
          )}
        >
          <div className="flex-1 min-w-0 order-2 sm:order-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Next
            </span>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {nextLesson.title}
            </p>
          </div>
          <div className="shrink-0 p-2 rounded-lg bg-muted/50 group-hover:bg-primary/10 transition-colors order-1 sm:order-2">
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </div>
        </Link>
      ) : (
        <div
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg border border-dashed border-muted-foreground/30',
            'bg-muted/20'
          )}
        >
          <div className="shrink-0 p-2 rounded-lg bg-muted/50">
            <ChevronRight className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              End of
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              Course Module
            </p>
          </div>
        </div>
      )}
    </nav>
  )
}

// Helper to get prev/next lessons from course data
export function getAdjacentLessons(
  modules: Array<{
    lessons: Array<{ id: number; title: string }>
  }>,
  currentLessonId: number
): { prev: { id: number; title: string; slug: string } | null; next: { id: number; title: string; slug: string } | null } {
  const allLessons: Array<{ id: number; title: string; slug: string }> = []
  
  // Flatten lessons from all modules
  modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      allLessons.push({
        id: lesson.id,
        title: lesson.title,
        slug: lesson.id.toString(), // placeholder for now - would need lesson slug
      })
    })
  })

  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId)

  return {
    prev: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
    next: currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null,
  }
}