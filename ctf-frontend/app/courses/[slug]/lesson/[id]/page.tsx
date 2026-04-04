import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BookOpen, Clock, Play, ExternalLink, AlertTriangle } from "lucide-react"
import { getCourseBySlug, Lesson } from "@/lib/api/courses"
import { sanitizeHtml } from "@/lib/sanitize"

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
  
  const moduleContainingLesson = course.modules.find((m: any) => 
    m.lessons.some((l: Lesson) => l.id === lesson.id)
  )
  
  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Navigation */}
        <Link
          href={`/courses/${slug}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {course.title}
        </Link>

        {/* Lesson Header */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="text-sm text-muted-foreground mb-2">
            {course.title} &gt; {moduleContainingLesson?.title}
          </div>
          <h1 className="text-3xl font-bold mb-4">{lesson.title}</h1>
          
          {lesson.videoUrl && (
            <a
              href={lesson.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Play className="w-4 h-4" />
              Watch Video
            </a>
          )}
        </div>

        {/* Main Content */}
        {lesson.content && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Theory
            </h2>
            <div 
              className="prose prose-sm sm:prose lg:prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.content) }}
            />
          </div>
        )}

        {/* Detailed Explanation */}
        {lesson.detailedExplanation && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              In-Depth Analysis
            </h2>
            <div 
              className="prose prose-sm sm:prose lg:prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(lesson.detailedExplanation) }}
            />
          </div>
        )}

        {/* Linked Challenges */}
        {lesson.challengeIds && lesson.challengeIds.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Related Challenges
            </h2>
            <div className="space-y-2">
              {lesson.challengeIds.map((challengeId) => (
                <Link
                  key={challengeId}
                  href={`/challenges/${challengeId}`}
                  className="block p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                >
                  <span className="font-medium">Challenge #{challengeId}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Real World Incidents */}
        {lesson.realWorldIncidents && lesson.realWorldIncidents.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Real-World Incidents</h2>
            <ul className="space-y-2">
              {lesson.realWorldIncidents.map((incident, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground">
                  <span className="text-primary">•</span>
                  <span>{incident}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External References */}
        {lesson.externalReferences && lesson.externalReferences.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold mb-4">Further Reading</h2>
            <ul className="space-y-2">
              {lesson.externalReferences.map((ref, index) => (
                <li key={index}>
                  <a
                    href={ref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2"
                  >
                    {ref}
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
