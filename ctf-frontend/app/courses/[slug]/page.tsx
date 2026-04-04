import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, Clock, Play } from "lucide-react"
import { getCourseBySlug, getAllCourses, Course, Module, Lesson } from "@/lib/api/courses"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const course = await getCourseBySlug(slug)
  if (!course) return { title: "Course Not Found" }
  
  return {
    title: `${course.title} | CTF Platform`,
    description: course.description || "Learn cybersecurity through structured courses",
  }
}

export async function generateStaticParams() {
  const courses = await getAllCourses()
  return courses.map((course) => ({
    slug: course.slug,
  }))
}

function getCourseColor(slug: string): string {
  const colors: Record<string, string> = {
    'binary-exploitation': 'border-l-red-500',
    'cryptography': 'border-l-blue-500',
    'forensics': 'border-l-green-500',
    'reverse-engineering': 'border-l-purple-500',
    'web-exploitation': 'border-l-yellow-500',
  }
  return colors[slug] || 'border-l-gray-500'
}

function getDifficultyColor(difficulty: string | null): string {
  const colors: Record<string, string> = {
    'Beginner': 'bg-green-500/10 text-green-500',
    'Intermediate': 'bg-yellow-500/10 text-yellow-500',
    'Advanced': 'bg-red-500/10 text-red-500',
  }
  return colors[difficulty || ''] || 'bg-gray-500/10 text-gray-500'
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "Self-paced"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params
  const course = await getCourseBySlug(slug)

  if (!course) {
    notFound()
  }

  const totalLessons = course.modules.reduce((acc: number, m: Module) => acc + m.lessons.length, 0)

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>

        <div className={`bg-card rounded-lg border border-border border-l-4 ${getCourseColor(slug)} p-6 mb-8`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {course.difficulty && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(course.difficulty)}`}>
                {course.difficulty}
              </span>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(course.estimatedMinutes)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>{totalLessons} lessons</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
          {course.description && (
            <p className="text-muted-foreground">{course.description}</p>
          )}
        </div>

        <div className="space-y-6">
          {course.modules.map((module: Module, moduleIndex: number) => (
            <div key={module.id} className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="bg-muted/50 px-6 py-4 border-b border-border">
                <h2 className="text-xl font-semibold">
                  Module {moduleIndex + 1}: {module.title}
                </h2>
              </div>
              
              <div className="divide-y divide-border">
                {module.lessons.map((lesson: Lesson, lessonIndex: number) => (
                  <Link
                    key={lesson.id}
                    href={`/courses/${slug}/lesson/${lesson.id}`}
                    className="block px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {lessonIndex + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{lesson.title}</h3>
                        {lesson.content && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {lesson.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {lesson.videoUrl && (
                      <a
                        href={lesson.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Play className="w-4 h-4" />
                        Watch
                      </a>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
