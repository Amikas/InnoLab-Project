"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
  Copy,
  MoreVertical,
  Loader2,
  Code2,
  Server,
  Zap
} from "lucide-react"
import type { Challenge } from "@/lib/types"
import EditChallengeModal from "./edit-challenge-modal"
import { deleteChallenge } from "@/lib/api/challenges"
import { useToast } from "@/hooks/use-toast"

interface ChallengeTableProps {
  challenges: Challenge[]
}

export default function ChallengeTable({ challenges }: ChallengeTableProps) {
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null)
  const [isDeleteLoading, setIsDeleteLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!deleteTarget) return

    setIsDeleteLoading(true)
    try {
      await deleteChallenge(deleteTarget.id)
      toast({
        title: "Challenge Deleted",
        description: `"${deleteTarget.title}" has been removed.`,
        duration: 3000,
      })
      setDeleteTarget(null)
      setTimeout(() => window.location.reload(), 1500)
    } catch (error) {
      toast({
        title: "Error Deleting Challenge",
        description: error instanceof Error ? error.message : "Failed to delete challenge.",
        variant: "destructive",
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
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-muted">
              <TableHead className="font-semibold text-card-foreground">Challenge</TableHead>
              <TableHead className="font-semibold text-card-foreground">Category</TableHead>
              <TableHead className="font-semibold text-card-foreground">Difficulty</TableHead>
              <TableHead className="font-semibold text-card-foreground text-right">Points</TableHead>
              <TableHead className="font-semibold text-card-foreground">Type</TableHead>
              <TableHead className="font-semibold text-card-foreground">Docker Image</TableHead>
              <TableHead className="w-12 text-right font-semibold text-card-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Zap className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-medium">No challenges found</p>
                    <p className="text-xs">Create your first challenge to get started</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              challenges.map((challenge) => (
                <TableRow 
                  key={challenge.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-foreground">{challenge.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
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
                      {getTypeDisplay(challenge.requiresInstance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <code className="relative rounded-sm bg-muted px-2 py-1 font-mono text-sm text-foreground">
                      {challenge.dockerImageName || "N/A"}
                    </code>
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
                          onClick={() => {
                            navigator.clipboard.writeText(challenge.dockerImageName || "")
                            toast({
                              title: "Copied",
                              description: "Docker image name copied to clipboard",
                              duration: 2000,
                            })
                          }}
                          className="cursor-pointer"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Docker Image
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteTarget?.title}"</span>? 
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
            toast({
              title: "Challenge Updated",
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