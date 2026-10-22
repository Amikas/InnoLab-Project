# Frontend Reference

**Base path:** `ctf-frontend/`
**Framework:** Next.js 16 (App Router)
**Language:** TypeScript 5
**Styling:** Tailwind CSS 4 + shadcn/ui

---

## Page Route Tree

```
/                                              Home — landing page
├── /login                                     Login form
├── /challenges                                Challenge listing (auth guard)
│   └── /challenges/[id]                       Challenge detail (auth guard)
├── /scoreboard                                Leaderboard
├── /profile                                   User profile (async, auth)
├── /courses                                   Course catalogue (auth guard)
│   └── /courses/[slug]                        Course detail with modules/lessons (auth guard)
│       └── /courses/[slug]/lesson/[id]        Lesson content with code blocks (auth guard)
├── /cryptography                              Category page
├── /forensics                                 Category page
├── /web-exploitation                          Category page
├── /binary-exploitation                       Category page
├── /reverse-engineering                       Category page
├── /admin                                     Admin dashboard (auth + admin guard)
│   ├── /admin/users                           User management
│   └── /admin/courses                         Course CRUD with TipTap editor
├── /about                                     About page
└── /help                                      Help centre
```

**Total: 19 page files**

---

## Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `Navbar` | `components/navbar.tsx` | Top nav: auth state, admin link, theme toggle |
| `Footer` | `components/footer.tsx` | Site footer |
| `LoginForm` | `components/login-form.tsx` | Username/password form with error handling |
| `ChallengeList` | `components/challenge-list.tsx` | Challenge browser: category/difficulty filters, search |
| `ChallengeDetail` | `components/challenge-detail.tsx` | Full challenge: description, download, terminal, hints, flag submit |
| `KaliTerminal` | `components/KaliTerminal.tsx` | xterm.js WebSocket terminal (modal) |
| `KaliTerminalClient` | `components/KaliTerminalClient.tsx` | Dynamic import wrapper (SSR disabled) |
| `Terminal` | `components/Terminal.tsx` | Alternative simpler terminal component |
| `CategoryPage` | `components/category-page.tsx` | Shared category showcase, used by all 5 category pages |
| `LessonContent` | `components/lesson/lesson-content.tsx` | Lesson renderer: code highlighting, callouts, headings |
| `CodeBlock` | `components/lesson/code-block.tsx` | Syntax-highlighted code with variant detection |
| `Callout` | `components/lesson/callout.tsx` | Info/warning/tip callout boxes |
| `TipTapEditor` | `components/tiptap-editor.tsx` | Rich text editor for course creation |
| `ThemeProvider` | `components/theme-provider.tsx` | Dark/light theme (next-themes) |
| `ThemeToggle` | `components/theme-toggle.tsx` | Theme switch button |

---

## API Client Layer (`lib/api/`)

| File | Exports |
|------|---------|
| `client.ts` | `ApiClient` class — HTTP wrapper with `credentials: 'include'`, blob download |
| `auth.ts` | `getUserInfo()`, `isAdmin()` |
| `challenges.ts` | `getAllChallenges()`, `getChallenge()`, `getChallengesByCategory()`, CRUD ops |
| `categories.ts` | `getAllCategories()`, `getCategoryById()`, `getCategoryByFrontendName()` |
| `courses.ts` | `getAllCourses()`, `getCourseBySlug()` + TypeScript types |
| `solves.ts` | `getMySolves()`, `checkIfSolved()`, `getSolveCount()`, leaderboard, stats |
| `scoreboard.ts` | `getScoreboard()`, `getMockScoreboard()` |
| `profile.ts` | `getUserProfile()`, `getMockProfile()` |
| `admin.ts` | `getAdminStats()`, CRUD for users/courses/modules/lessons |

## Server Actions (`lib/actions/`)

| File | Exports |
|------|---------|
| `auth.ts` | `loginUser()`, `logoutUser()`, `isAuthenticated()`, `requireAuth()` |
| `challenges.ts` | `submitFlag()` |
| `admin.ts` | Admin action helpers + revalidation stubs |

## Hooks

| Hook | File | Purpose |
|------|------|---------|
| `AuthProvider` / `useAuth` | `lib/hooks/use-auth.tsx` | Auth context: login, logout, auth state, admin check |
| `useMobile` | `lib/hooks/use-mobile.ts` | Mobile device detection |
| `useToast` | `lib/hooks/use-toast.ts` | Toast notifications |

---

## Root Layout

```
<html> → <body> → <ThemeProvider> → <AuthProvider> → <Navbar />
<main>{children}</main>
<Footer />
```

Providers: `ThemeProvider` (class-based, system default), `AuthProvider` (React context)

## Middleware

`middleware.ts` is intentionally minimal. It redirects `/courses/*` to `/login` when the `auth_token` cookie is absent, but does not treat cookie presence as proof of authentication. Token validity is always decided by the backend API (`/api/user/me`), including in the server-side `requireAuth()` guard used by course pages.

Runs on: `/challenges/:path*`, `/profile/:path*`, `/admin/:path*`, `/courses/:path*`, `/login`
