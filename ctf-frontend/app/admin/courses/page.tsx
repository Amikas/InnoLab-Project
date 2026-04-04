"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Plus, Edit, Trash2, BookOpen, Layout, FileText, 
  Eye, EyeOff, ChevronRight, Loader2, ArrowLeft
} from "lucide-react"
import { useAuth } from '@/lib/hooks/use-auth'
import TipTapEditor from "@/components/tiptap-editor"
import { 
  getAllCoursesAdmin, createCourse, updateCourse, deleteCourse, publishCourse,
  getAllModulesAdmin, createModule, updateModule, deleteModule,
  getAllLessonsAdmin, createLesson, updateLesson, deleteLesson,
  type CourseAdmin, type ModuleAdmin, type LessonAdmin
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
  const [selectedCourse, setSelectedCourse] = useState<CourseAdmin | null>(null)
  const [selectedModule, setSelectedModule] = useState<ModuleAdmin | null>(null)
  
  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalType, setModalType] = useState<"course" | "module" | "lesson">("course")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) {
      router.push('/')
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
      const [coursesData, modulesData, lessonsData] = await Promise.all([
        getAllCoursesAdmin(),
        getAllModulesAdmin(),
        getAllLessonsAdmin()
      ])
      setCourses(coursesData)
      setModules(modulesData)
      setLessons(lessonsData)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  function getModulesForCourse(courseId: number) {
    return modules.filter(m => m.courseId === courseId)
  }

  function getLessonsForModule(moduleId: number) {
    return lessons.filter(l => l.moduleId === moduleId)
  }

  function openModal(type: "course" | "module" | "lesson", item: any = null) {
    setModalType(type)
    setEditingItem(item)
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
      console.error('Failed to save:', err)
      alert(err instanceof Error ? err.message : 'Failed to save')
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
      console.error('Failed to delete:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  async function handlePublish(id: number, currentPublished: boolean) {
    try {
      await publishCourse(id, !currentPublished)
      await loadData()
    } catch (err) {
      console.error('Failed to publish:', err)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!auth.isAuthenticated || !auth.isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Course Management</h1>
              <p className="text-muted-foreground">Manage courses, modules, and lessons</p>
            </div>
          </div>
          <button
            onClick={() => openModal(view === "courses" ? "course" : view === "modules" ? "module" : "lesson")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add {view === "courses" ? "Course" : view === "modules" ? "Module" : "Lesson"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setView("courses")}
            className={`px-4 py-2 font-medium transition-colors ${
              view === "courses" 
                ? "text-primary border-b-2 border-primary -mb-px" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4 inline mr-2" />
            Courses
          </button>
          <button
            onClick={() => setView("modules")}
            className={`px-4 py-2 font-medium transition-colors ${
              view === "modules" 
                ? "text-primary border-b-2 border-primary -mb-px" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layout className="w-4 h-4 inline mr-2" />
            Modules
          </button>
          <button
            onClick={() => setView("lessons")}
            className={`px-4 py-2 font-medium transition-colors ${
              view === "lessons" 
                ? "text-primary border-b-2 border-primary -mb-px" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Lessons
          </button>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Courses View */}
        {view === "courses" && (
          <div className="space-y-4">
            {courses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No courses yet. Create your first course!
              </div>
            ) : (
              courses.map(course => (
                <div key={course.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{course.title}</h3>
                        <p className="text-sm text-muted-foreground">{course.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        course.isPublished 
                          ? "bg-green-500/10 text-green-500" 
                          : "bg-yellow-500/10 text-yellow-500"
                      }`}>
                        {course.isPublished ? "Published" : "Draft"}
                      </span>
                      <button
                        onClick={() => handlePublish(course.id, course.isPublished)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title={course.isPublished ? "Unpublish" : "Publish"}
                      >
                        {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openModal("course", course)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete("course", course.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-14">{course.description}</p>
                  <div className="flex items-center gap-4 mt-2 ml-14 text-xs text-muted-foreground">
                    <span>{getModulesForCourse(course.id).length} modules</span>
                    <span>{getLessonsForModule(getModulesForCourse(course.id)[0]?.id).length} lessons</span>
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
              <div className="text-center py-12 text-muted-foreground">
                No modules yet. Create your first module!
              </div>
            ) : (
              modules.map(module => {
                const course = courses.find(c => c.id === module.courseId)
                return (
                  <div key={module.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-secondary/10 rounded-lg">
                          <Layout className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{module.title}</h3>
                          <p className="text-sm text-muted-foreground">Course: {course?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal("module", module)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete("module", module.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 ml-14 text-xs text-muted-foreground">
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
              <div className="text-center py-12 text-muted-foreground">
                No lessons yet. Create your first lesson!
              </div>
            ) : (
              lessons.map(lesson => {
                const module = modules.find(m => m.id === lesson.moduleId)
                const course = courses.find(c => c.id === module?.courseId)
                return (
                  <div key={lesson.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Module: {module?.title} • Course: {course?.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openModal("lesson", lesson)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete("lesson", lesson.id)}
                          className="p-2 hover:bg-muted rounded-lg transition-colors text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 ml-14 text-xs text-muted-foreground">
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingItem?.id ? "Edit" : "Create"} {modalType}
              </h2>
              
              <div className="space-y-4">
                {modalType === "course" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug</label>
                      <input
                        type="text"
                        value={editingItem?.slug || ""}
                        onChange={e => setEditingItem({...editingItem, slug: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={editingItem?.description || ""}
                        onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Difficulty</label>
                      <select
                        value={editingItem?.difficulty || ""}
                        onChange={e => setEditingItem({...editingItem, difficulty: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
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
                      <label className="block text-sm font-medium mb-1">Course</label>
                      <select
                        value={editingItem?.courseId || ""}
                        onChange={e => setEditingItem({...editingItem, courseId: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      >
                        <option value="">Select course</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Order</label>
                      <input
                        type="number"
                        value={editingItem?.orderIndex || 0}
                        onChange={e => setEditingItem({...editingItem, orderIndex: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                  </>
                )}

                {modalType === "lesson" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Module</label>
                      <select
                        value={editingItem?.moduleId || ""}
                        onChange={e => setEditingItem({...editingItem, moduleId: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      >
                        <option value="">Select module</option>
                        {modules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Title</label>
                      <input
                        type="text"
                        value={editingItem?.title || ""}
                        onChange={e => setEditingItem({...editingItem, title: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Content</label>
                      <TipTapEditor
                        content={editingItem?.content || ""}
                        onChange={(html) => setEditingItem({...editingItem, content: html})}
                        placeholder="Write your lesson content here..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Detailed Explanation</label>
                      <TipTapEditor
                        content={editingItem?.detailedExplanation || ""}
                        onChange={(html) => setEditingItem({...editingItem, detailedExplanation: html})}
                        placeholder="In-depth analysis and explanations..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Video URL</label>
                      <input
                        type="text"
                        value={editingItem?.videoUrl || ""}
                        onChange={e => setEditingItem({...editingItem, videoUrl: e.target.value})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Order</label>
                      <input
                        type="number"
                        value={editingItem?.orderIndex || 0}
                        onChange={e => setEditingItem({...editingItem, orderIndex: Number(e.target.value)})}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
