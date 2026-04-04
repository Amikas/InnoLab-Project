import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { 
  ArrowLeft, 
  Clock, 
  Play, 
  ExternalLink, 
  AlertTriangle,
  CheckCircle,
  ListChecks,
  Target,
  Bug,
  Shield,
  Wrench
} from "lucide-react"
import { getCourseBySlug, Lesson } from "@/lib/api/courses"
import { sanitizeHtml } from "@/lib/sanitize"
import { extractAllHeadings, formatDuration } from "@/lib/lesson-utils"
import LessonContent from "@/components/lesson-content"
import { ProgressIndicator } from "@/components/lesson/progress-indicator"
import { TableOfContents } from "@/components/lesson/table-of-contents"
import { LessonNav, getAdjacentLessons } from "@/components/lesson/lesson-nav"
import { Callout } from "@/components/lesson/callout"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Props {
  params: Promise<{ slug: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params
  const course = await getCourseBySlug(slug)
  
  if (!course) return { title: "Course Not Found" }
  
  const lesson = findLesson(course.modules, parseInt(id))
  if (!lesson) return { title: "Lesson Not Found" }
  
  return {
    title: `${lesson.title} | ${course.title} | CTF Platform`,
    description: `Learn about ${lesson.title} in ${course.title}`,
  }
}

export async function generateStaticParams() {
  const course = await getCourseBySlug("web-exploitation")
  if (!course) return []
  
  const params: Array<{ slug: string; id: string }> = []
  course.modules.forEach((module) => {
    module.lessons.forEach((lesson) => {
      params.push({ slug: "web-exploitation", id: lesson.id.toString() })
    })
  })
  
  return params
}

function findLesson(modules: any[], lessonId: number): Lesson | null {
  for (const module of modules) {
    for (const lesson of module.lessons) {
      if (lesson.id === lessonId) {
        return lesson
      }
    }
  }
  return null
}

function getDifficultyColor(difficulty: string | null): string {
  const colors: Record<string, string> = {
    'Beginner': 'bg-green-500/10 text-green-500 border-green-500/20',
    'Intermediate': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    'Advanced': 'bg-red-500/10 text-red-500 border-red-500/20',
  }
  return colors[difficulty || ''] || 'bg-muted text-muted-foreground border-border'
}

// Calculate total lessons in course
function getTotalLessons(modules: any[]): number {
  return modules.reduce((total, module) => total + (module.lessons?.length || 0), 0)
}

export default async function LessonDetailPage({ params }: Props) {
  const { slug, id } = await params
  const course = await getCourseBySlug(slug)
  
  if (!course) {
    notFound()
  }
  
  const lesson = findLesson(course.modules, parseInt(id))
  
  if (!lesson) {
    notFound()
  }
  
  const moduleContainingLesson = course.modules.find((mod: any) => 
    mod.lessons.some((l: Lesson) => l.id === lesson.id)
  )
  
  // Get adjacent lessons for navigation
  const { prev, next } = getAdjacentLessons(course.modules, parseInt(id))
  const totalLessons = getTotalLessons(course.modules)
  const currentLessonIndex = course.modules.reduce((idx: number, m: any) => {
    const inModule = m.lessons.findIndex((l: Lesson) => l.id === lesson.id)
    if (inModule >= 0) return idx + inModule
    return idx + m.lessons.length
  }, 0)
  
  // Extract headings for TOC
  const headings = extractAllHeadings(lesson.content || '', lesson.detailedExplanation || '')

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back navigation */}
          <Link
            href={`/courses/${slug}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {course.title}
          </Link>
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <span>{course.title}</span>
            <span>/</span>
            <span>{moduleContainingLesson?.title}</span>
          </div>
          
          {/* Title and meta row */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
                {lesson.title}
              </h1>
              
              {/* Meta badges */}
              <div className="flex flex-wrap items-center gap-3">
                {course.difficulty && (
                  <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                    {course.difficulty}
                  </Badge>
                )}
                {course.estimatedMinutes && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(course.estimatedMinutes)}</span>
                  </div>
                )}
                {lesson.videoUrl && (
                  <a
                    href={lesson.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Watch Video
                  </a>
                )}
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="w-full lg:w-64 shrink-0">
              <ProgressIndicator
                currentLessonId={parseInt(id)}
                totalLessons={totalLessons}
                completedLessons={0} // placeholder for now
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Warning callout for security content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Callout type="warning" title="Educational Purpose Only">
          The code examples in this lesson demonstrate vulnerabilities for educational purposes. 
          Never use these techniques on systems without explicit authorization.
        </Callout>
      </div>
      
      {/* Main content area with TOC sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <main className="flex-1 min-w-0 lg:max-w-4xl">
            {/* Theory Section */}
            {lesson.content && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Theory</h2>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                  <LessonContent content={sanitizeHtml(lesson.content)} />
                </div>
              </section>
            )}
            
            {/* Detailed Explanation Section */}
            {lesson.detailedExplanation && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">In-Depth Analysis</h2>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                  <LessonContent content={sanitizeHtml(lesson.detailedExplanation)} />
                </div>
              </section>
            )}
            
            {/* Real World Incidents */}
            {lesson.realWorldIncidents && lesson.realWorldIncidents.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-semibold text-foreground mb-4">Real-World Incidents</h2>
                <div className="bg-card rounded-lg border border-border p-6">
                  <ul className="space-y-2">
                    {lesson.realWorldIncidents.map((incident, index) => (
                      <li key={index} className="text-muted-foreground text-sm">{incident}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            
            {/* Linked Challenges */}
            {lesson.challengeIds && lesson.challengeIds.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="w-5 h-5 text-purple-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Practice Challenges</h2>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                  <div className="grid gap-3">
                    {lesson.challengeIds.map((challengeId) => (
                      <Link
                        key={challengeId}
                        href={`/challenges/${challengeId}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <Target className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">Challenge #{challengeId}</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
            
            {/* External References */}
            {lesson.externalReferences && lesson.externalReferences.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Tools & Resources</h2>
                </div>
                <div className="bg-card rounded-lg border border-border p-6">
                  <ul className="space-y-2">
                    {lesson.externalReferences.map((ref, index) => (
                      <li key={index}>
                        <a
                          href={ref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span className="truncate">{ref}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}
            
            {/* Summary Card */}
            <section className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-foreground">Key Takeaways</h2>
              </div>
              <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-lg border border-green-500/20 p-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">Understand the mechanics of the vulnerability</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">Identify vulnerable code patterns</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">Apply secure coding best practices</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-foreground">Test your knowledge with the practice challenges</span>
                  </li>
                </ul>
              </div>
            </section>
            
            {/* Lesson Navigation */}
            <section>
              <LessonNav
                prevLesson={prev}
                nextLesson={next}
                courseSlug={slug}
              />
            </section>
          </main>
          
          {/* TOC Sidebar - Desktop only */}
          <aside className="hidden lg:block w-56 shrink-0">
            <TableOfContents headings={headings} />
          </aside>
        </div>
      </div>
    </div>
  )
}