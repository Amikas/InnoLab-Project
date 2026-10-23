"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Edit, 
  Trash2, 
  MoreVertical,
  Loader2,
  Search,
  SlidersHorizontal,
  X,
  Zap
} from "lucide-react"
import type { Challenge } from "@/lib/types"
import EditChallengeModal from "./edit-challenge-modal"
import { deleteChallenge } from "@/lib/api/challenges"
import { toast } from "sonner"

interface ChallengeTableProps {
  challenges: Challenge[]
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  )
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter(item => item !== value) : [...values, value]
}

export default function ChallengeTable({ challenges }: ChallengeTableProps) {
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [activeDifficulties, setActiveDifficulties] = useState<string[]>([])
  const [activeCategories, setActiveCategories] = useState<string[]>([])
  const [activeTypes, setActiveTypes] = useState<string[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const query = window.matchMedia("(max-width: 639px)")
    const update = () => setIsCompact(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!filtersOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFiltersOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFiltersOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [filtersOpen])

  const difficultyOptions = useMemo(() => {
    const labels = new Map<string, string>()
    for (const challenge of challenges) {
      const key = challenge.difficulty.toLowerCase()
      if (!labels.has(key)) labels.set(key, challenge.difficulty)
    }
    const order = ["easy", "medium", "hard"]
    return [...labels.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai !== -1 || bi !== -1) return (ai === -1 ? order.length : ai) - (bi === -1 ? order.length : bi)
      return a.localeCompare(b)
    })
  }, [challenges])

  const categoryOptions = useMemo(
    () => [...new Set(challenges.map(challenge => challenge.category))].sort((a, b) => a.localeCompare(b)),
    [challenges],
  )

  const typeOptions = useMemo(() => {
    const present = new Set(challenges.map(challenge => challenge.requiresInstance ? "instance" : "static"))
    return ([["instance", "Instance"], ["static", "Static"]] as const)
      .filter(([value]) => present.has(value))
  }, [challenges])

  const filteredChallenges = useMemo(() => {
    const term = search.trim().toLowerCase()
    return challenges.filter(challenge => {
      if (term && !challenge.title.toLowerCase().includes(term) && !challenge.id.toLowerCase().includes(term)) return false
      if (activeDifficulties.length > 0 && !activeDifficulties.includes(challenge.difficulty.toLowerCase())) return false
      if (activeCategories.length > 0 && !activeCategories.includes(challenge.category)) return false
      if (activeTypes.length > 0 && !activeTypes.includes(challenge.requiresInstance ? "instance" : "static")) return false
      return true
    })
  }, [challenges, search, activeDifficulties, activeCategories, activeTypes])

  const hasActiveFilters = search.trim() !== ""
    || activeDifficulties.length > 0
    || activeCategories.length > 0
    || activeTypes.length > 0

  const activeFilterCount = activeDifficulties.length + activeCategories.length + activeTypes.length

  const searchInput = (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search by title or ID…"
        aria-label="Search challenges by title or ID"
        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  )

  function clearFilters() {
    setSearch("")
    setActiveDifficulties([])
    setActiveCategories([])
    setActiveTypes([])
  }

  function toggleFilters() {
    if (!filtersOpen && filterRef.current) {
      const rect = filterRef.current.getBoundingClientRect()
      setOpenUp(window.innerHeight - rect.bottom < (isCompact ? 520 : 400))
    }
    setFiltersOpen(open => !open)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleteLoading(true)
    try {
      await deleteChallenge(deleteTarget.id)
      toast.success("Challenge Deleted", {
        description: `"${deleteTarget.title}" has been removed.`,
        duration: 3000,
      })
      setDeleteTarget(null)
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      toast.error("Error Deleting Challenge", {
        description: error instanceof Error ? error.message : "Failed to delete challenge.",
        duration: 4000,
      })
    } finally {
      setIsDeleteLoading(false)
    }
  }

  const getDifficultyBadge = (difficulty: string) => {
    const config: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      easy: "default",
      medium: "secondary",
      hard: "destructive",
    }
    const variant = config[difficulty.toLowerCase()] || "default"
    return (
      <Badge variant={variant} className="capitalize">
        {difficulty}
      </Badge>
    )
  }

  const getCategoryBadge = (category: string) => {
    return (
      <Badge variant="outline" className="capitalize">
        {category.replace("-", " ")}
      </Badge>
    )
  }

  const getTypeDisplay = (requiresInstance: boolean) => {
    return requiresInstance ? "Instance" : "Static"
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {!isCompact && <div className="min-w-0 flex-1 sm:max-w-sm">{searchInput}</div>}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground sm:text-sm">
                {filteredChallenges.length} of {challenges.length} challenge{challenges.length === 1 ? "" : "s"}
              </span>
              <div ref={filterRef} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleFilters}
                  aria-expanded={filtersOpen}
                  aria-controls="challenge-filter-panel"
                  aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : "Filters"}
                  disabled={challenges.length === 0}
                  className="relative h-9 w-9 p-0"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  {activeFilterCount > 0 && (
                    <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                {filtersOpen && (
                  <div
                    id="challenge-filter-panel"
                    role="dialog"
                    aria-label="Challenge filters"
                    className={cn(
                      "absolute right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-border bg-card p-4 text-left shadow-lg",
                      openUp ? "bottom-full mb-2" : "top-full mt-2",
                    )}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">Filter challenges</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                      >
                        Clear all
                      </Button>
                    </div>

                    {isCompact && <div className="mb-3">{searchInput}</div>}

                    <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                      {difficultyOptions.length > 0 && (
                        <fieldset>
                          <legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Difficulty</legend>
                          <div className="flex flex-wrap gap-1.5">
                            {difficultyOptions.map(([value, label]) => (
                              <FilterChip
                                key={value}
                                label={label}
                                active={activeDifficulties.includes(value)}
                                onClick={() => setActiveDifficulties(current => toggleValue(current, value))}
                              />
                            ))}
                          </div>
                        </fieldset>
                      )}
                      {categoryOptions.length > 0 && (
                        <fieldset>
                          <legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Category</legend>
                          <div className="flex flex-wrap gap-1.5">
                            {categoryOptions.map(category => (
                              <FilterChip
                                key={category}
                                label={category.replaceAll("-", " ")}
                                active={activeCategories.includes(category)}
                                onClick={() => setActiveCategories(current => toggleValue(current, category))}
                              />
                            ))}
                          </div>
                        </fieldset>
                      )}
                      {typeOptions.length > 0 && (
                        <fieldset>
                          <legend className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Type</legend>
                          <div className="flex flex-wrap gap-1.5">
                            {typeOptions.map(([value, label]) => (
                              <FilterChip
                                key={value}
                                label={label}
                                active={activeTypes.includes(value)}
                                onClick={() => setActiveTypes(current => toggleValue(current, value))}
                              />
                            ))}
                          </div>
                        </fieldset>
                      )}
                      {difficultyOptions.length === 0 && categoryOptions.length === 0 && typeOptions.length === 0 && (
                        <p className="text-sm text-muted-foreground">No filters available yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted">
              <TableHead className="w-2/5 font-semibold text-card-foreground">Challenge</TableHead>
              <TableHead className="font-semibold text-card-foreground">Category</TableHead>
              <TableHead className="font-semibold text-card-foreground">Difficulty</TableHead>
              <TableHead className="font-semibold text-card-foreground text-right">Points</TableHead>
              <TableHead className="font-semibold text-card-foreground">Type</TableHead>
              <TableHead className="w-12 text-right font-semibold text-card-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Zap className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No challenges found</p>
                    <p className="text-xs">Create your first challenge to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredChallenges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No challenges match your filters</p>
                    <p className="text-xs">Try a different search term or clear the filters.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredChallenges.map((challenge) => (
                <TableRow 
                  key={challenge.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="max-w-[300px]">
                    <div className="truncate">
                      <p className="font-semibold text-foreground truncate">{challenge.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {challenge.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryBadge(challenge.category)}</TableCell>
                  <TableCell>{getDifficultyBadge(challenge.difficulty)}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-semibold text-foreground">
                      {challenge.points}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">
                      {getTypeDisplay(!!challenge.requiresInstance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => setEditingChallenge(challenge)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Challenge
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(challenge)}
                          className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Challenge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{deleteTarget?.title}&quot;</span>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">
              ⚠️ All associated submissions and data will be permanently removed.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {editingChallenge && (
        <EditChallengeModal
          challenge={editingChallenge}
          isOpen={!!editingChallenge}
          onClose={() => setEditingChallenge(null)}
          onSave={() => {
            setEditingChallenge(null)
            toast.success("Challenge Updated", {
              description: "Your changes have been saved successfully.",
              duration: 3000,
            })
            setTimeout(() => window.location.reload(), 1500)
          }}
        />
      )}
    </>
  )
}