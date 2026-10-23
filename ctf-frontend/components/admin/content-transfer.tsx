"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  CheckCircle2,
  FileArchive,
  Loader2,
  PackageOpen,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
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

const MAX_PACKAGE_BYTES = 50 * 1024 * 1024
const FILE_INPUT_ID = "content-transfer-file"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isZipPackage(file: File) {
  return /\.zip$/i.test(file.name)
    || file.type === "application/zip"
    || file.type === "application/x-zip-compressed"
}

export default function ContentTransfer() {
  const { t } = useTranslation()
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
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const previewRequest = useRef(0)

  useEffect(() => {
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
  }, [])

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

  async function runPreview(target: File) {
    const request = ++previewRequest.current
    setError(null)
    setSummary(null)
    setPreview(null)
    setBusy("preview")
    try {
      const result = await previewContent(target)
      if (request !== previewRequest.current) return
      setPreview(result)
      setDecisions({})
    } catch (err) {
      if (request !== previewRequest.current) return
      setFileError(err instanceof Error ? err.message : "This package could not be read.")
    } finally {
      if (request === previewRequest.current) setBusy(null)
    }
  }

  async function prepareFile(next: File | null) {
    if (!next) return
    if (!isZipPackage(next)) {
      setFileError("That file is not a ZIP package. Choose a .zip archive to continue.")
      return
    }
    if (next.size > MAX_PACKAGE_BYTES) {
      setFileError(`“${next.name}” is ${formatBytes(next.size)}. Packages must be 50 MB or smaller.`)
      return
    }
    setFileError(null)
    setFile(next)
    await runPreview(next)
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    event.target.value = ""
    void prepareFile(next)
  }

  function clearFile() {
    previewRequest.current++
    setFile(null)
    setPreview(null)
    setSummary(null)
    setDecisions({})
    setFileError(null)
    setBusy(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (busy !== null) return
    dragDepth.current += 1
    setIsDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (busy === null) event.dataTransfer.dropEffect = "copy"
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setIsDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    if (busy !== null) return
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) void prepareFile(dropped)
  }

  async function handleImport() {
    if (!file || !preview || !decisionsComplete) return
    setError(null)
    setFileError(null)
    setBusy("import")
    try {
      const choices: ConflictDecision[] = preview.conflicts.map(conflict => ({
        type: conflict.type,
        key: conflict.key,
        action: decisions[`${conflict.type}:${conflict.key}`],
      }))
      setSummary(await importContent(file, choices))
      previewRequest.current++
      setFile(null)
      setPreview(null)
      setDecisions({})
      if (fileInputRef.current) fileInputRef.current.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="content-transfer-heading" className="bg-card border border-border rounded-lg p-6">
      <h2 id="content-transfer-heading" className="text-2xl font-bold text-foreground mb-6">{t('admin.importExport')}</h2>
      {error && <p role="alert" className="mb-6 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive">{error}</p>}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-lg bg-muted p-4">
          <div className="mb-5 flex items-center gap-3"><ArrowDownToLine className="h-5 w-5" /><h3 className="text-xl font-semibold">Export</h3></div>
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
              {challenges.length > 0 && <div><h4 className="mb-2 font-medium">Challenges</h4><div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
                {challenges.map(challenge => <label key={challenge.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={selectedChallenges.includes(challenge.id)} onChange={() => toggleSelected("challenge", challenge.id)} /><span>{challenge.title}<span className="ml-2 text-muted-foreground">{challenge.id}</span></span></label>)}
              </div></div>}
              {courses.length > 0 && <div><h4 className="mb-2 font-medium">Courses</h4><div className="max-h-56 space-y-2 overflow-auto rounded-md border p-3">
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

        <section className="min-w-0 rounded-lg bg-muted p-4">
          <div className="mb-5 flex items-center gap-3"><ArrowUpFromLine className="h-5 w-5" /><h3 className="text-xl font-semibold">Import</h3></div>
          <p className="mb-4 text-sm text-muted-foreground">The package contains content and files only. Destination environments create their own challenge instances and flags.</p>

          <div
            data-testid="content-transfer-dropzone"
            aria-busy={busy === "preview"}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative rounded-xl border-2 border-dashed bg-background/60 p-4 transition-all duration-200",
              "focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10",
              isDragging
                ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                : "border-border hover:border-primary/40 hover:bg-primary/[0.03]",
            )}
          >
            <input
              ref={fileInputRef}
              id={FILE_INPUT_ID}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              onChange={handleFileInput}
              className="sr-only"
              aria-label="Import ZIP package"
            />

            {file ? (
              <div className="flex items-center gap-3">
                <span className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-lg",
                  fileError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
                )}>
                  <FileArchive className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(file.size)} · {busy === "preview"
                      ? "Checking package…"
                      : fileError ? "Could not read package" : preview ? "Ready to review below" : "ZIP package"}
                  </p>
                </div>
                {busy === "preview" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <label htmlFor={FILE_INPUT_ID} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Replace
                    </label>
                    <button type="button" onClick={clearFile} disabled={busy !== null} aria-label="Remove file" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50">
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label htmlFor={FILE_INPUT_ID} className="flex cursor-pointer flex-col items-center gap-3 px-2 py-5 text-center">
                <span className={cn(
                  "grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground shadow-sm ring-1 ring-border transition-all duration-200",
                  isDragging && "-translate-y-0.5 scale-110 bg-primary/10 text-primary ring-primary/30",
                )}>
                  <UploadCloud className="h-6 w-6" aria-hidden />
                </span>
                <span className="block text-sm">
                  <span className="block text-base font-medium text-foreground">
                    {isDragging ? "Drop the package to preview it" : "Drag & drop your ZIP package"}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    or <span className="font-medium text-primary underline decoration-primary/40 underline-offset-4">browse files</span> · up to 50 MB
                  </span>
                </span>
              </label>
            )}

            {fileError && (
              <p role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{fileError}</span>
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Dropping a package starts a safety check. Nothing is imported until you review it.</p>

          {preview && <div className="mt-5 overflow-hidden rounded-xl border bg-background">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4 text-muted-foreground" aria-hidden />
                <p className="text-sm font-semibold">Package preview</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                  {preview.challengeCount} challenge{preview.challengeCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                  {preview.courseCount} course{preview.courseCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div className="space-y-4 p-4">
              {preview.conflicts.length === 0 ? (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                  <span>No matching IDs or slugs exist here, every item will be added.</span>
                </p>
              ) : <>
                <p className="text-sm text-muted-foreground">
                  <strong className="font-medium text-foreground">{preview.conflicts.length}</strong> item{preview.conflicts.length === 1 ? "" : "s"} already exist{preview.conflicts.length === 1 ? "s" : ""} here. Choose whether to keep the existing version or replace it.
                </p>
                <div className="space-y-2">{preview.conflicts.map(conflict => {
                  const conflictId = `${conflict.type}:${conflict.key}`
                  return <div key={conflictId} className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">{conflict.incomingTitle}</p>
                    </div>
                    <div role="radiogroup" aria-label={`Action for ${conflict.incomingTitle}`} className="flex shrink-0 gap-2 self-start sm:self-auto">
                      {([ ["SKIP", "Keep existing"], ["UPDATE", "Replace"] ] as const).map(([action, label]) => (
                        <label key={action} className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          decisions[conflictId] === action
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-foreground",
                        )}>
                          <input type="radio" name={conflictId} className="sr-only" checked={decisions[conflictId] === action} onChange={() => setDecisions(current => ({ ...current, [conflictId]: action }))} />
                          {decisions[conflictId] === action && <Check className="h-3.5 w-3.5" aria-hidden />}
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                })}</div>
              </>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  {decisionsComplete
                    ? "Nothing changes until you import."
                    : "Choose Keep existing or Replace for each item to continue."}
                </p>
                <button onClick={handleImport} disabled={busy !== null || !decisionsComplete} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
                  {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpFromLine className="h-4 w-4" />} Import content
                </button>
              </div>
            </div>
          </div>}

          {summary && <p role="status" className="mt-5 flex items-start gap-2 rounded-lg border border-green-600/30 bg-green-600/10 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
            <span>Imported {summary.challengesCreated} new challenges and {summary.coursesCreated} new courses; updated {summary.challengesUpdated} challenges and {summary.coursesUpdated} courses; skipped {summary.skipped}.</span>
          </p>}
        </section>
      </div>
    </section>
  )
}
