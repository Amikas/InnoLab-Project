import type { Metadata } from "next"
import Link from "next/link"
import { Clock, Target } from "lucide-react"
import { getAllCourses, CourseListItem } from "@/lib/api/courses"

export const metadata: Metadata = {
  title: "Courses | CTF Platform",
  description: "Learn cybersecurity through structured courses",
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "Self-paced"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours}h ${mins}m`
}

function getCourseColor(slug: string): string {
  const colors: Record<string, string> = {
    'binary-exploitation': 'from-red-500 to-orange-500',
    'cryptography': 'from-blue-500 to-cyan-500',
    'forensics': 'from-green-500 to-emerald-500',
    'reverse-engineering': 'from-purple-500 to-pink-500',
    'web-exploitation': 'from-yellow-500 to-orange-500',
  }
  return colors[slug] || 'from-gray-500 to-gray-600'
}

export default async function CoursesPage() {
  const courses = await getAllCourses()

  if (courses.length === 0) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">Courses</h1>
            <p className="text-muted-foreground">Structured learning paths to master cybersecurity</p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">No courses available yet. Check back soon!</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Courses</h1>
          <p className="text-muted-foreground">Structured learning paths to master cybersecurity</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: CourseListItem) => (
            <Link key={course.id} href={`/courses/${course.slug}`} className="group">
              <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-all hover:scale-105 h-full flex flex-col">
                <div className={`w-full h-2 rounded-full bg-gradient-to-r ${getCourseColor(course.slug)} mb-4`} />

                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>

                <p className="text-muted-foreground text-sm mb-6 flex-1">{course.description}</p>

                <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(course.estimatedMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>{course.lessonCount} lessons</span>
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
