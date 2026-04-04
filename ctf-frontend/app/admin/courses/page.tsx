"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Layout,
  FileText,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import TipTapEditor from "@/components/tiptap-editor"
import {
  getAllCoursesAdmin,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  getAllModulesAdmin,
  createModule,
  updateModule,
  deleteModule,
  getAllLessonsAdmin,
  createLesson,
  updateLesson,
  deleteLesson,
  type CourseAdmin,
  type ModuleAdmin,
  type LessonAdmin,
} from "@/lib/api/admin"

export default function AdminCoursesPage() {
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [courses, setCourses] = useState<CourseAdmin[]>([])
  const [modules, setModules] = useState<ModuleAdmin[]>([])
  const [lessons, setLessons] = useState<LessonAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI State
  const [view, setView] = useState<"courses" | "modules" | "lessons">("courses")

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalType, setModalType] = useState<"course" | "module" | "lesson">("course")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) {
      router.push("/")
    }
  }, [auth, authLoading, router])

  useEffect(() => {
    if (auth.isAuthenticated && auth.isAdmin) {
      loadData()
    }
  }, [auth.isAuthenticated, auth.isAdmin])

  async function loadData() {
    try {
      setIsLoading(true)
      setError(null)

      const [coursesData, modulesData, lessonsData] = await Promise.all([
        getAllCoursesAdmin(),
        getAllModulesAdmin(),
        getAllLessonsAdmin(),
      ])

      setCourses(coursesData)
      setModules(modulesData)
      setLessons(lessonsData)
    } catch (err) {
      console.error("Failed to load data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  function getModulesForCourse(courseId: number) {
    return modules.filter((m) => m.courseId === courseId)
  }

  function getLessonsForModule(moduleId: number) {
    return lessons.filter((l) => l.moduleId === moduleId)
  }

  function getLessonCountForCourse(courseId: number) {
    const courseModules = getModulesForCourse(courseId)
    return courseModules.reduce((total, module) => {
      return total + getLessonsForModule(module.id).length
    }, 0)
  }

  function openModal(type: "course" | "module" | "lesson", item: any = null) {
    setModalType(type)

    if (item) {
      setEditingItem(item)
    } else {
      if (type === "course") {
        setEditingItem({
          title: "",
          slug: "",
          description: "",
          difficulty: "",
        })
      } else if (type === "module") {
        setEditingItem({
          courseId: "",
          title: "",
          orderIndex: 0,
        })
      } else {
        setEditingItem({
          moduleId: "",
          title: "",
          content: "",
          detailedExplanation: "",
          videoUrl: "",
          orderIndex: 0,
        })
      }
    }

    setShowModal(true)
  }

  async function handleSave() {
    setIsSaving(true)

    try {
      if (modalType === "course") {
        if (editingItem?.id) {
          await updateCourse(editingItem.id, editingItem)
        } else {
          await createCourse(editingItem)
        }
      } else if (modalType === "module") {
        if (editingItem?.id) {
          await updateModule(editingItem.id, editingItem)
        } else {
          await createModule(editingItem)
        }
      } else if (modalType === "lesson") {
        if (editingItem?.id) {
          await updateLesson(editingItem.id, editingItem)
        } else {
          await createLesson(editingItem)
        }
      }

      await loadData()
      setShowModal(false)
      setEditingItem(null)
    } catch (err) {
      console.error("Failed to save:", err)
      alert(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(type: "course" | "module" | "lesson", id: number) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      if (type === "course") await deleteCourse(id)
      else if (type === "module") await deleteModule(id)
      else if (type === "lesson") await deleteLesson(id)

      await loadData()
    } catch (err) {
      console.error("Failed to delete:", err)
      alert(err instanceof Error ? err.message : "Failed to delete")
    }
  }

  async function handlePublish(id: number, currentPublished: boolean) {
    try {
      await publishCourse(id, !currentPublished)
      await loadData()
    } catch (err) {
      console.error("Failed to publish:", err)
      alert(err instanceof Error ? err.message : "Failed to update publish status")
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen cursor-wait bg-background py-12 px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!auth.isAuthenticated || !auth.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
              <p className="text-muted-foreground">Manage courses, modules, and lessons</p>
            </div>
          </div>

          <button
            onClick={() =>
              openModal(
                view === "courses" ? "course" : view === "modules" ? "module" : "lesson"
              )
            }
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add {view === "courses" ? "Course" : view === "modules" ? "Module" : "Lesson"}
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-border">
          <button
            onClick={() => setView("courses")}
            className={`cursor-pointer px-4 py-2 font-medium transition-colors ${
              view === "courses"
                ? "-mb-px border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="mr-2 inline h-4 w-4" />
            Courses
          </button>

          <button
            onClick={() => setView("modules")}
            className={`cursor-pointer px-4 py-2 font-medium transition-colors ${
              view === "modules"
                ? "-mb-px border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout className="mr-2 inline h-4 w-4" />
            Modules
          </button>

          <button
            onClick={() => setView("lessons")}
            className={`cursor-pointer px-4 py-2 font-medium transition-colors ${
              view === "lessons"
                ? "-mb-px border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="mr-2 inline h-4 w-4" />
            Lessons
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
            {error}
          </div>
        )}

        {/* Courses View */}
        {view === "courses" && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No courses yet. Create your first course!
              </div>
            ) : (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>

                      <div>
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          course.isPublished
                            ? "bg-green-500/10 text-green-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {course.isPublished ? "Published" : "Draft"}
                      </span>

                      <button
                        onClick={() => handlePublish(course.id, course.isPublished)}
                        className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
                        title={course.isPublished ? "Unpublish" : "Publish"}
                      >
                        {course.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        onClick={() => openModal("course", course)}
                        className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
                        title="Edit course"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete("course", course.id)}
                        className="cursor-pointer rounded-lg p-2 text-destructive transition-colors hover:bg-muted"
                        title="Delete course"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 ml-14 text-sm text-muted-foreground">{course.description}</p>

                  <div className="mt-2 ml-14 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{getModulesForCourse(course.id).length} modules</span>
                    <span>{getLessonCountForCourse(course.id)} lessons</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Modules View */}
        {view === "modules" && (
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No modules yet. Create your first module!
              </div>
            ) : (
              modules.map((module) => {
                const course = courses.find((c) => c.id === module.courseId)

                return (
                  <div
                    key={module.id}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-secondary/10 p-2">
                          <Layout className="h-5 w-5 text-secondary" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">{module.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Course: {course?.title ?? "Unknown course"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal("module", module)}
                          className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
                          title="Edit module"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete("module", module.id)}
                          className="cursor-pointer rounded-lg p-2 text-destructive transition-colors hover:bg-muted"
                          title="Delete module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 ml-14 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Order: {module.orderIndex}</span>
                      <span>{getLessonsForModule(module.id).length} lessons</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Lessons View */}
        {view === "lessons" && (
          <div className="space-y-4">
            {lessons.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No lessons yet. Create your first lesson!
              </div>
            ) : (
              lessons.map((lesson) => {
                const module = modules.find((m) => m.id === lesson.moduleId)
                const course = courses.find((c) => c.id === module?.courseId)

                return (
                  <div
                    key={lesson.id}
                    className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-accent/10 p-2">
                          <FileText className="h-5 w-5 text-accent" />
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Module: {module?.title ?? "Unknown module"} • Course:{" "}
                            {course?.title ?? "Unknown course"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal("lesson", lesson)}
                          className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
                          title="Edit lesson"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete("lesson", lesson.id)}
                          className="cursor-pointer rounded-lg p-2 text-destructive transition-colors hover:bg-muted"
                          title="Delete lesson"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 ml-14 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Order: {lesson.orderIndex}</span>
                      <span>{lesson.challengeIds?.length || 0} linked challenges</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm ${
            isSaving ? "cursor-wait" : ""
          }`}
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-border bg-card">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-semibold">
                {editingItem?.id ? "Edit" : "Create"} {modalType}
              </h2>

              <div className="space-y-4">
                {modalType === "course" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, title: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Slug</label>
                      <input
                        type="text"
                        value={editingItem?.slug || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, slug: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Description</label>
                      <textarea
                        value={editingItem?.description || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, description: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Difficulty</label>
                      <select
                        value={editingItem?.difficulty || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, difficulty: e.target.value })
                        }
                        className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <option value="">Select difficulty</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </>
                )}

                {modalType === "module" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Course</label>
                      <select
                        value={editingItem?.courseId || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            courseId: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <option value="">Select course</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, title: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Order</label>
                      <input
                        type="number"
                        value={editingItem?.orderIndex || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            orderIndex: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>
                  </>
                )}

                {modalType === "lesson" && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Module</label>
                      <select
                        value={editingItem?.moduleId || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            moduleId: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-pointer rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <option value="">Select module</option>
                        {modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, title: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Content</label>
                      <div className="cursor-text">
                        <TipTapEditor
                          content={editingItem?.content || ""}
                          onChange={(html) =>
                            setEditingItem({ ...editingItem, content: html })
                          }
                          placeholder="Write your lesson content here..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Detailed Explanation
                      </label>
                      <div className="cursor-text">
                        <TipTapEditor
                          content={editingItem?.detailedExplanation || ""}
                          onChange={(html) =>
                            setEditingItem({
                              ...editingItem,
                              detailedExplanation: html,
                            })
                          }
                          placeholder="In-depth analysis and explanations..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Video URL</label>
                      <input
                        type="text"
                        value={editingItem?.videoUrl || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, videoUrl: e.target.value })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium">Order</label>
                      <input
                        type="number"
                        value={editingItem?.orderIndex || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            orderIndex: Number(e.target.value),
                          })
                        }
                        className="w-full cursor-text rounded-lg border border-border bg-background px-3 py-2"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  disabled={isSaving}
                  className="cursor-pointer rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}