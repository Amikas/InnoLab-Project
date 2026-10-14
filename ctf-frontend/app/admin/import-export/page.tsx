"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { getAllChallenges } from "@/lib/api/challenges"
import { getAllCoursesAdmin, type CourseAdmin } from "@/lib/api/admin"
import {
  exportContent,
  importContent,
  previewContent,
  type ConflictDecision,
  type ContentPreview,
  type ExportScope,
  type ImportSummary,
} from "@/lib/api/content-transfer"
import type { Challenge } from "@/lib/types"

type ItemType = "challenge" | "course"

export default function AdminImportExportPage() {
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [courses, setCourses] = useState<CourseAdmin[]>([])
  const [mode, setMode] = useState<ExportScope>("ALL")
  const [itemType, setItemType] = useState<ItemType>("challenge")
  const [itemKey, setItemKey] = useState("")
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ContentPreview | null>(null)
  const [decisions, setDecisions] = useState<Record<string, "SKIP" | "UPDATE">>({})
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [busy, setBusy] = useState<"loading" | "export" | "preview" | "import" | null>("loading")
  const [error, setError] = useState<string | null>(null)
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false)

  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) router.push("/")
  }, [auth, authLoading, router])

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.isAdmin) return
    Promise.all([getAllChallenges(), getAllCoursesAdmin()])
      .then(([challengeData, courseData]) => {
        setChallenges(challengeData)
        setCourses(courseData)
        setItemType(challengeData.length > 0 ? "challenge" : "course")
      })
      .catch((err: unknown) => {
        setCatalogLoadFailed(true)
        setError(err instanceof Error ? err.message : "Could not load content.")
      })
      .finally(() => setBusy(null))
  }, [auth.isAuthenticated, auth.isAdmin])

  const hasExportableContent = challenges.length > 0 || courses.length > 0
  const hasBothItemTypes = challenges.length > 0 && courses.length > 0
  const effectiveItemType: ItemType = itemType === "challenge" && challenges.length === 0
    ? "course"
    : itemType === "course" && courses.length === 0 ? "challenge" : itemType
  const availableItems = effectiveItemType === "challenge" ? challenges : courses
  const chosenCount = mode === "ITEM" ? Number(Boolean(itemKey)) : selectedChallenges.length + selectedCourses.length
  const decisionsComplete = useMemo(() => preview?.conflicts.every(conflict =>
    decisions[`${conflict.type}:${conflict.key}`] !== undefined) ?? false, [preview, decisions])

  function toggleSelected(type: ItemType, key: string) {
    const setter = type === "challenge" ? setSelectedChallenges : setSelectedCourses
    setter(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])
  }

  async function handleExport() {
    setError(null)
    setBusy("export")
    try {
      const payload = mode === "ITEM"
        ? { mode, challengeIds: effectiveItemType === "challenge" ? [itemKey] : [], courseSlugs: effectiveItemType === "course" ? [itemKey] : [] }
        : { mode, challengeIds: mode === "ALL" ? [] : selectedChallenges, courseSlugs: mode === "ALL" ? [] : selectedCourses }
      const { blob, filename } = await exportContent(payload)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename || "innolab-content.zip"
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setBusy(null)
    }
  }

  async function handlePreview() {
    if (!file) return
    setError(null)
    setSummary(null)
    setBusy("preview")
    try {
      setPreview(await previewContent(file))
      setDecisions({})
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : "This package could not be read.")
    } finally {
      setBusy(null)
    }
  }

  async function handleImport() {
    if (!file || !preview || !decisionsComplete) return
    setError(null)
    setBusy("import")
    try {
      const choices: ConflictDecision[] = preview.conflicts.map(conflict => ({
        type: conflict.type,
        key: conflict.key,
        action: decisions[`${conflict.type}:${conflict.key}`],
      }))
      setSummary(await importContent(file, choices))
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setBusy(null)
    }
  }

  if (authLoading || !auth.isAuthenticated || !auth.isAdmin) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="rounded-md border p-2 hover:bg-muted" aria-label="Back to admin"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <h1 className="text-3xl font-bold">Content import and export</h1>
            <p className="mt-1 text-muted-foreground">Move challenge and course content between environments.</p>
          </div>
        </div>

        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><ArrowDownToLine className="h-5 w-5" /><h2 className="text-xl font-semibold">Export</h2></div>
          {busy === "loading" ? <p className="text-sm text-muted-foreground">Loading challenges and courses…</p> : catalogLoadFailed ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Could not load content to export. Refresh the page to try again.</p>
          ) : !hasExportableContent ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="font-medium">Nothing to export</p>
              <p className="mt-1 text-sm text-muted-foreground">There are no challenges or courses in this environment yet.</p>
            </div>
          ) : <>
          <p className="mb-4 text-sm text-muted-foreground">Course exports include every challenge linked from their lessons.</p>
          <fieldset className="grid gap-3 sm:grid-cols-3">
            {([ ["ALL", "Everything"], ["SELECTED", "Selected items"], ["ITEM", "One item"] ] as const).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 rounded-md border p-3">
                <input type="radio" name="exportMode" checked={mode === value} onChange={() => setMode(value)} />{label}
              </label>
            ))}
          </fieldset>

          {mode === "SELECTED" && (
            <div className={`mt-5 grid gap-5 ${hasBothItemTypes ? "md:grid-cols-2" : ""}`}>
              {challenges.length > 0 && <div><h3 className="mb-2 font-medium">Challenges</h3><div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
                {challenges.map(challenge => <label key={challenge.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selectedChallenges.includes(challenge.id)} onChange={() => toggleSelected("challenge", challenge.id)} /><span>{challenge.title}<span className="ml-2 text-muted-foreground">{challenge.id}</span></span></label>)}
              </div></div>}
              {courses.length > 0 && <div><h3 className="mb-2 font-medium">Courses</h3><div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
                {courses.map(course => <label key={course.slug} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selectedCourses.includes(course.slug)} onChange={() => toggleSelected("course", course.slug)} /><span>{course.title}<span className="ml-2 text-muted-foreground">{course.slug}</span></span></label>)}
              </div></div>}
            </div>
          )}

          {mode === "ITEM" && <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {hasBothItemTypes ? <select className="rounded-md border bg-background p-2" value={effectiveItemType} onChange={event => { setItemType(event.target.value as ItemType); setItemKey("") }}>
              <option value="challenge">Challenge</option><option value="course">Course</option>
            </select> : <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{effectiveItemType === "challenge" ? "Challenge" : "Course"}</p>}
            <select className="min-w-0 flex-1 rounded-md border bg-background p-2" value={itemKey} onChange={event => setItemKey(event.target.value)}>
              <option value="">Choose one…</option>
              {availableItems.map(item => effectiveItemType === "challenge"
                ? <option key={(item as Challenge).id} value={(item as Challenge).id}>{(item as Challenge).title} · {(item as Challenge).id}</option>
                : <option key={(item as CourseAdmin).slug} value={(item as CourseAdmin).slug}>{(item as CourseAdmin).title} · {(item as CourseAdmin).slug}</option>)}
            </select>
          </div>}

          <button onClick={handleExport} disabled={busy !== null || (mode !== "ALL" && chosenCount === 0)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />} Download ZIP
          </button>
          </>}
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3"><ArrowUpFromLine className="h-5 w-5" /><h2 className="text-xl font-semibold">Import</h2></div>
          <p className="mb-4 text-sm text-muted-foreground">The package contains content and files only. Destination environments create their own challenge instances and flags.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input type="file" accept=".zip,application/zip" onChange={event => { setFile(event.target.files?.[0] ?? null); setPreview(null); setSummary(null); setDecisions({}) }} className="block w-full text-sm" />
            <button onClick={handlePreview} disabled={!file || busy !== null} className="rounded-md border px-4 py-2 font-medium disabled:opacity-50">
              {busy === "preview" ? "Checking…" : "Preview package"}
            </button>
          </div>

          {preview && <div className="mt-5 space-y-4 rounded-lg bg-muted/50 p-4">
            <p>Package has <strong>{preview.challengeCount}</strong> challenges and <strong>{preview.courseCount}</strong> courses.</p>
            {preview.conflicts.length === 0 ? <p>No matching IDs or slugs exist here; all items will be added.</p> : <>
              <p className="text-sm text-muted-foreground">Choose what to do with each existing item. Updates replace its content; skips leave it untouched.</p>
              <div className="space-y-3">{preview.conflicts.map(conflict => {
                const conflictId = `${conflict.type}:${conflict.key}`
                return <div key={conflictId} className="flex flex-col justify-between gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center">
                  <div><p className="font-medium">{conflict.incomingTitle}</p><p className="text-xs text-muted-foreground">{conflict.type} · {conflict.key} · existing: {conflict.existingTitle}</p></div>
                  <div className="flex shrink-0 gap-4 text-sm">
                    {([ ["SKIP", "Skip"], ["UPDATE", "Update existing"] ] as const).map(([action, label]) => <label key={action} className="flex items-center gap-2"><input type="radio" name={conflictId} checked={decisions[conflictId] === action} onChange={() => setDecisions(current => ({ ...current, [conflictId]: action }))} />{label}</label>)}
                  </div>
                </div>
              })}</div>
            </>}
            <button onClick={handleImport} disabled={busy !== null || !decisionsComplete} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-50">
              {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />} Import content
            </button>
          </div>}

          {summary && <p role="status" className="mt-5 rounded-md border border-green-600/30 bg-green-600/10 p-3">
            Imported {summary.challengesCreated} new challenges and {summary.coursesCreated} new courses; updated {summary.challengesUpdated} challenges and {summary.coursesUpdated} courses; skipped {summary.skipped}.
          </p>}
        </section>
      </div>
    </main>
  )
}
