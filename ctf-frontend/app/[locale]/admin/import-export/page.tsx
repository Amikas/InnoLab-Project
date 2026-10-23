"use client"

import { useEffect } from "react"
import Link from "@/components/localized-link"
import { useRouter } from "next/navigation"
import { useLocalePath } from "@/lib/i18n/use-locale"
import { ArrowLeft, Loader2 } from "lucide-react"
import ContentTransfer from "@/components/admin/content-transfer"
import { useAuth } from "@/lib/hooks/use-auth"

export default function AdminImportExportPage() {
  const { auth, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const withLocale = useLocalePath()

  useEffect(() => {
    if (!authLoading && (!auth.isAuthenticated || !auth.isAdmin)) router.push(withLocale("/"))
  }, [auth, authLoading, router])

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

        <ContentTransfer />
      </div>
    </main>
  )
}
