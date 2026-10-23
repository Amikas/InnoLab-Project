"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "@/components/localized-link"
import { useRouter } from "next/navigation"
import { useLocalePath } from "@/lib/i18n/use-locale"
import { ArrowLeft, Loader2, Pencil, Shield, UserCheck, UserX, Users } from "lucide-react"

import { useAuth } from "@/lib/hooks/use-auth"
import {
  getAllUsers,
  updateUserAdmin,
  type AdminUser,
  type AdminUserUpdate,
} from "@/lib/api/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UserEditState = {
  id: number
  email: string
  displayName: string
  isAdmin: boolean
  isActive: boolean
}

function formatDateTime(value: string | null) {
  if (!value) return "Never"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString()
}

export default function AdminUsersPage() {
  const { auth, isLoading: authLoading, checkAuth } = useAuth()
  const router = useRouter()
  const withLocale = useLocalePath()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [formState, setFormState] = useState<UserEditState | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) {
      router.push(withLocale("/"))
    }
  }, [auth, authLoading, router])

  useEffect(() => {
    if (auth.isAuthenticated && auth.isAdmin) {
      void loadUsers()
    }
  }, [auth.isAuthenticated, auth.isAdmin])

  async function loadUsers() {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllUsers()
      setUsers(data)
    } catch (err) {
      console.error("Failed to load users:", err)
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  function openEditDialog(user: AdminUser) {
    setEditingUser(user)
    setFormState({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
    })
  }

  function closeEditDialog() {
    setEditingUser(null)
    setFormState(null)
    setIsSaving(false)
  }

  async function handleSave() {
    if (!formState) return

    setIsSaving(true)
    setError(null)

    const payload: AdminUserUpdate = {
      email: formState.email.trim(),
      displayName: formState.displayName.trim(),
      isAdmin: formState.isAdmin,
      isActive: formState.isActive,
    }

    try {
      const updated = await updateUserAdmin(formState.id, payload)
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
      closeEditDialog()
      if (updated.username === auth.user) {
        await checkAuth()
      }
    } catch (err) {
      console.error("Failed to update user:", err)
      setError(err instanceof Error ? err.message : "Failed to update user")
      setIsSaving(false)
    }
  }

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users

    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.displayName.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, users])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-12">
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
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-foreground">User Management</h1>
              <p className="text-muted-foreground">Manage admin access and account activation</p>
            </div>
          </div>

          <div className="w-full sm:w-80">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by username, email, or name"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Users className="h-6 w-6 text-primary" />
                {users.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Admins</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <Shield className="h-6 w-6 text-primary" />
                {users.filter((user) => user.isAdmin).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Users</CardDescription>
              <CardTitle className="flex items-center gap-2 text-3xl">
                <UserCheck className="h-6 w-6 text-primary" />
                {users.filter((user) => user.isActive).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted">
                <TableHead className="font-semibold text-card-foreground">User</TableHead>
                <TableHead className="font-semibold text-card-foreground">Email</TableHead>
                <TableHead className="font-semibold text-card-foreground">Role</TableHead>
                <TableHead className="font-semibold text-card-foreground">Status</TableHead>
                <TableHead className="font-semibold text-card-foreground">Last Login</TableHead>
                <TableHead className="w-24 text-right font-semibold text-card-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="mb-2 h-8 w-8 opacity-40" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs">Try adjusting your search query</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-border hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{user.username}</p>
                        <p className="text-sm text-muted-foreground">{user.displayName}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isAdmin ? "default" : "secondary"}>
                        {user.isAdmin ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "outline" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit {user.username}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!editingUser} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update account details, admin access, and activation state for {editingUser?.username}.
              </DialogDescription>
            </DialogHeader>

            {formState && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" value={editingUser?.username ?? ""} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formState.displayName}
                      onChange={(event) =>
                        setFormState((current) =>
                          current ? { ...current, displayName: event.target.value } : current
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) =>
                        current ? { ...current, email: event.target.value } : current
                      )
                    }
                  />
                </div>

                <div className="grid gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:grid-cols-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <Shield className="h-4 w-4" />
                        Admin Access
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Allow this user to access admin-only routes and tools.
                      </p>
                    </div>
                    <Switch
                      checked={formState.isAdmin}
                      onCheckedChange={(checked) =>
                        setFormState((current) =>
                          current ? { ...current, isAdmin: checked } : current
                        )
                      }
                    />
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        {formState.isActive ? (
                          <UserCheck className="h-4 w-4" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                        Account Active
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Inactive users cannot complete a new login.
                      </p>
                    </div>
                    <Switch
                      checked={formState.isActive}
                      onCheckedChange={(checked) =>
                        setFormState((current) =>
                          current ? { ...current, isActive: checked } : current
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium text-foreground">Created</p>
                    <p className="text-muted-foreground">{formatDateTime(editingUser?.createdAt ?? null)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Last Login</p>
                    <p className="text-muted-foreground">{formatDateTime(editingUser?.lastLoginAt ?? null)}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeEditDialog} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formState}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
