import type { Metadata } from "next"
import Link from "next/link"
import { Clock, Target } from "lucide-react"
import { getAllCourses, CourseListItem } from "@/lib/api/courses"
import { requireAuth } from "@/lib/actions/auth"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { pickLocalized } from "@/lib/i18n/content"

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Courses | CTF Platform",
  description: "Learn cybersecurity through structured courses",
}

function formatDuration(minutes: number | null, dict: { selfPaced: string }): string {
  if (!minutes) return dict.selfPaced
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

function getCourseColor(slug: string): string {
  const colors: Record<string, string> = {
    'binary-exploitation': 'bg-red-500',
    'cryptography': 'bg-blue-500',
    'forensics': 'bg-green-600',
    'reverse-engineering': 'bg-purple-600',
    'web-exploitation': 'bg-yellow-500',
  }
  return colors[slug] || 'bg-gray-500'
}

export default async function CoursesPage() {
  await requireAuth()
  const courses = await getAllCourses()
  const locale = await getLocale()
  const dict = getDictionary(locale)
  const contentLocale = locale === "de" ? "de" : "en"

  if (courses.length === 0) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">{dict.courses.title}</h1>
            <p className="text-muted-foreground">{dict.courses.subtitle}</p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">{dict.courses.empty}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">{dict.courses.title}</h1>
          <p className="text-muted-foreground">{dict.courses.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: CourseListItem) => (
            <Link key={course.id} href={`/courses/${course.slug}`} className="group">
              <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-all hover:scale-105 h-full flex flex-col">
                <div className={`w-full h-2 rounded-full ${getCourseColor(course.slug)} mb-4`} />

                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {pickLocalized(course.title, course.titleDe, contentLocale)}
                </h3>

                <p className="text-muted-foreground text-sm mb-6 flex-1 line-clamp-3">
                  {pickLocalized(course.description, course.descriptionDe, contentLocale)}
                </p>

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(course.estimatedMinutes, { selfPaced: dict.courses.selfPaced })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>{course.lessonCount} {dict.courses.lessons}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
