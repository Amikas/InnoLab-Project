"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useLocalePath } from "@/lib/i18n/use-locale"
import Link from "@/components/localized-link"
import { useAuth } from "@/lib/hooks/use-auth"
import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

export default function LoginForm() {
    const { t } = useTranslation()
    const router = useRouter()
  const withLocale = useLocalePath()
    const { login, isLoading } = useAuth()
    const [error, setError] = useState("")

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError("")

        const formData = new FormData(e.currentTarget)
        const credentials = {
            username: formData.get('username') as string,
            password: formData.get('password') as string,
        }

        try {
            const result = await login(credentials)

            if (result.success) {
                // Check if user is admin and redirect accordingly
                const isAdmin = result.data?.isAdmin || false

                if (isAdmin) {
                    router.push(withLocale("/admin"))
                } else {
                    router.push(withLocale("/challenges"))
                }
                router.refresh()
            } else {
                setError(result.error || t("login.failed"))
            }
        } catch (err) {
            setError(t("login.unexpected"))
        }
    }

    return (
        <div className="bg-card p-8 rounded-lg border border-border">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-2">
                        {t("login.usernameLabel")}
                    </label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        required
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t("login.usernamePlaceholder")}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2">
                        {t("login.passwordLabel")}
                    </label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        required
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder={t("login.passwordPlaceholder")}
                    />
                </div>

                <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" name="remember" defaultChecked className="rounded border-border" />
                        <span className="text-muted-foreground">{t("login.rememberMe")}</span>
                    </label>
                    <Link href="/help#forgot-password" className="text-primary hover:underline">
                        {t("login.forgotPassword")}
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? t("login.submitting") : t("login.submit")}
                </button>
            </form>
        </div>
    )
}