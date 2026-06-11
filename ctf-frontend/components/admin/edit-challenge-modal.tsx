"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Terminal, Monitor, Code, Server, X } from "lucide-react"
import type { Challenge } from "@/lib/types"
import { updateChallenge } from "@/lib/api/challenges"
import { toast } from "sonner"

// Form validation schema
const challengeFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  points: z.number().min(1, "Points must be at least 1"),
  flag: z.string().optional(),
  file: z.instanceof(File).optional(),

  // Instance fields
  requiresInstance: z.boolean().default(false),
  dockerImageName: z.string().optional(),

  // Hints
  hints: z.array(z.string()).optional(),
})

type ChallengeFormValues = z.infer<typeof challengeFormSchema>

interface EditChallengeModalProps {
  challenge: Challenge | null
  isOpen: boolean
  onClose: () => void
  onSave: () => void
}

export default function EditChallengeModal({ challenge, isOpen, onClose, onSave }: EditChallengeModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hints, setHints] = useState<string[]>(challenge?.hints || [])
  const [newHint, setNewHint] = useState("")

  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      difficulty: "easy",
      points: 100,
      flag: "",
      requiresInstance: false,
      dockerImageName: "",
    },
  })

  const requiresInstance = form.watch("requiresInstance")

  // Reset form when challenge changes
  useEffect(() => {
    if (challenge) {
      form.reset({
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points: challenge.points,
        flag: challenge.flag || "",
        requiresInstance: challenge.requiresInstance || false,
        dockerImageName: challenge.dockerImageName || "",
        defaultSshPort: challenge.defaultSshPort || 30000,
        defaultVscodePort: challenge.defaultVscodePort || 31000,
        defaultDesktopPort: challenge.defaultDesktopPort || 32000,
      })
      setHints(challenge.hints || [])
    }
  }, [challenge, form])

  const onSubmit = async (data: ChallengeFormValues) => {
    if (!challenge) return

    setIsLoading(true)
    try {
      await updateChallenge(challenge.id, {
        title: data.title,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty,
        points: data.points,
        flag: data.flag,
        file: data.file,
        requiresInstance: data.requiresInstance,
        dockerImageName: data.requiresInstance ? data.dockerImageName : undefined,
        hints: hints.length > 0 ? hints : undefined,
      })

      toast.success("Challenge updated!", {
        description: "The challenge has been successfully updated.",
      })

      onSave()
    } catch (error) {
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to update challenge",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Challenge</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Web SQL Injection" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="web-exploitation">Web Exploitation</SelectItem>
                        <SelectItem value="cryptography">Cryptography</SelectItem>
                        <SelectItem value="reverse-engineering">Reverse Engineering</SelectItem>
                        <SelectItem value="binary-exploitation">Binary Exploitation</SelectItem>
                        <SelectItem value="forensics">Forensics</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the challenge and what players need to do..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!requiresInstance && (
                <FormField
                  control={form.control}
                  name="flag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flag</FormLabel>
                      <FormControl>
                        <Input placeholder="FLAG{example_flag}" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* File Upload */}
            <FormField
              control={form.control}
              name="file"
              render={({ field: { value, onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Challenge Files (ZIP) - Optional Update</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="*"
                      onChange={(e) => onChange(e.target.files?.[0])}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload a new ZIP file to replace the existing one (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Instance Configuration */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="requiresInstance"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Requires Running Instance</FormLabel>
                      <FormDescription>
                        Enable if this challenge needs a Docker container with SSH, VSCode, or Desktop access
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {requiresInstance && (
                <Alert>
                  <Server className="h-4 w-4" />
                  <AlertDescription>
                    Instance-based challenge: Players will get a dedicated Docker container
                  </AlertDescription>
                </Alert>
              )}

              {requiresInstance && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border rounded-lg p-6 bg-muted/50">
                  <FormField
                    control={form.control}
                    name="dockerImageName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Docker Image Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ctf/web-challenge" {...field} />
                        </FormControl>
                        <FormDescription>
                          Docker image that will be run for this challenge
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    {/* Port fields removed - allocation happens instantly on server */}
                  </div>
                </div>
              )}
            </div>

            {/* Hints Section */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Add a hint..."
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newHint.trim()) {
                      setHints([...hints, newHint.trim()])
                      setNewHint("")
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newHint.trim()) {
                      setHints([...hints, newHint.trim()])
                      setNewHint("")
                    }
                  }}
                  disabled={!newHint.trim()}
                >
                  Add Hint
                </Button>
              </div>

              {hints.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Hints ({hints.length}):</p>
                  <div className="space-y-2">
                    {hints.map((hint, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{hint}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setHints(hints.filter((_, i) => i !== index))}
                          className="h-6 w-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Challenge"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}