import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminDashboardPage from '@/app/[locale]/admin/page'
import AdminImportExportPage from '@/app/[locale]/admin/import-export/page'
import { getAdminStats, getAllCoursesAdmin } from '@/lib/api/admin'
import { getAllChallenges } from '@/lib/api/challenges'
import { exportContent, importContent, previewContent } from '@/lib/api/content-transfer'

const { authState, router } = vi.hoisted(() => ({
  authState: {
    auth: { isAuthenticated: true, isAdmin: true, user: 'admin' },
    isLoading: false,
  },
  router: { push: vi.fn() },
}))

vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/en/admin/import-export' }))
vi.mock('@/lib/hooks/use-auth', () => ({ useAuth: () => authState }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock('@/lib/api/admin', () => ({ getAdminStats: vi.fn(), getAllCoursesAdmin: vi.fn() }))
vi.mock('@/lib/api/challenges', () => ({ getAllChallenges: vi.fn() }))
vi.mock('@/lib/api/content-transfer', () => ({
  exportContent: vi.fn(),
  importContent: vi.fn(),
  previewContent: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  authState.auth = { isAuthenticated: true, isAdmin: true, user: 'admin' }
  vi.mocked(getAdminStats).mockResolvedValue({
    totalChallenges: 1,
    totalUsers: 1,
    totalSubmissions: 0,
    activeChallenges: 1,
    challengesByCategory: [{ category: 'cryptography', count: 1 }],
    challengesByDifficulty: [{ difficulty: 'easy', count: 1 }],
  })
  vi.mocked(getAllChallenges).mockResolvedValue([{
    id: 'crypto-1',
    title: 'First challenge',
    description: 'A test challenge',
    category: 'cryptography',
    difficulty: 'easy',
    points: 100,
    solved: false,
  }])
  vi.mocked(getAllCoursesAdmin).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Admin import/export card', () => {
  it('renders the working controls below the breakdowns instead of a header link', async () => {
    const createObjectURL = vi.fn(() => 'blob:content')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const blob = new Blob(['content'])
    vi.mocked(exportContent).mockResolvedValue({ blob, filename: 'content.zip' })

    render(<AdminDashboardPage />)

    const heading = await screen.findByRole('heading', { name: 'admin.importExport', level: 2 })
    const categoryHeading = screen.getByRole('heading', { name: 'admin.byCategory', level: 2 })
    const difficultyHeading = screen.getByRole('heading', { name: 'admin.byDifficulty', level: 2 })
    expect(heading.compareDocumentPosition(categoryHeading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(heading.compareDocumentPosition(difficultyHeading) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Export', level: 3 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Import', level: 3 })).toBeInTheDocument()
    expect(document.querySelector('a[href="/en/admin/import-export"]')).toBeNull()

    fireEvent.click(await screen.findByRole('radio', { name: 'Selected items' }))
    const download = screen.getByRole('button', { name: 'Download ZIP' })
    expect(download).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /First challenge/ }))
    fireEvent.click(download)

    await waitFor(() => expect(exportContent).toHaveBeenCalledWith({
      mode: 'SELECTED', challengeIds: ['crypto-1'], courseSlugs: [],
    }))
    await waitFor(() => expect(download).toBeEnabled())
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:content')
  })

  it('keeps the separate page and its preview/conflict/import workflow working', async () => {
    vi.mocked(previewContent).mockResolvedValue({
      challengeCount: 1,
      courseCount: 0,
      conflicts: [{ type: 'challenge', key: 'crypto-1', existingTitle: 'Old challenge', incomingTitle: 'New challenge' }],
    })
    vi.mocked(importContent).mockResolvedValue({
      challengesCreated: 0, challengesUpdated: 1, coursesCreated: 0, coursesUpdated: 0, skipped: 0,
    })

    render(<AdminImportExportPage />)

    expect(screen.getByRole('heading', { name: 'Content import and export', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to admin' })).toHaveAttribute('href', '/en/admin')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download ZIP' })).toBeEnabled())

    const file = new File(['content'], 'content.zip', { type: 'application/zip' })
    fireEvent.change(screen.getByLabelText('Import ZIP package'), { target: { files: [file] } })

    const importButton = await screen.findByRole('button', { name: 'Import content' })
    expect(previewContent).toHaveBeenCalledWith(file)
    expect(importButton).toBeDisabled()
    expect(importContent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('radio', { name: 'Replace' }))
    fireEvent.click(importButton)

    await waitFor(() => expect(importContent).toHaveBeenCalledWith(file, [{
      type: 'challenge', key: 'crypto-1', action: 'UPDATE',
    }]))
    expect(await screen.findByRole('status')).toHaveTextContent('updated 1 challenges')
  })

  it('auto-previews a dropped ZIP and rejects other file types', async () => {
    vi.mocked(previewContent).mockResolvedValue({ challengeCount: 1, courseCount: 0, conflicts: [] })

    render(<AdminImportExportPage />)
    const dropzone = await screen.findByTestId('content-transfer-dropzone')

    fireEvent.drop(dropzone, { dataTransfer: { files: [new File(['notes'], 'notes.txt', { type: 'text/plain' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('not a ZIP package')
    expect(previewContent).not.toHaveBeenCalled()
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()

    const zip = new File(['content'], 'content.zip', { type: 'application/zip' })
    fireEvent.drop(dropzone, { dataTransfer: { files: [zip] } })

    await waitFor(() => expect(previewContent).toHaveBeenCalledWith(zip))
    expect(await screen.findByText('Package preview')).toBeInTheDocument()
    expect(screen.getByText('content.zip')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Import content' })).toBeEnabled()
  })

  it.each([AdminDashboardPage, AdminImportExportPage])('does not load transfer content for non-admins (%#)', async (Page) => {
    authState.auth = { isAuthenticated: true, isAdmin: false, user: 'student' }

    render(<Page />)

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/en'))
    expect(getAllChallenges).not.toHaveBeenCalled()
    expect(getAllCoursesAdmin).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'admin.importExport' })).not.toBeInTheDocument()
  })
})
