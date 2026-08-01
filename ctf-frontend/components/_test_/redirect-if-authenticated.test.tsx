import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import RedirectIfAuthenticated from '../redirect-if-authenticated'

// vi.mock factories are hoisted, so mutable state must live in vi.hoisted.
const { replaceMock, routerMock, authState } = vi.hoisted(() => {
  const replaceMock = vi.fn()
  return {
    replaceMock,
    routerMock: { replace: replaceMock },
    authState: {
      auth: { isAuthenticated: false, isAdmin: false },
      isLoading: false,
    },
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}))

vi.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => ({
    auth: authState.auth,
    isLoading: authState.isLoading,
  }),
}))

function renderGuestPage() {
  return render(
    <RedirectIfAuthenticated>
      <form aria-label="guest-page">Guest content</form>
    </RedirectIfAuthenticated>,
  )
}

beforeEach(() => {
  replaceMock.mockClear()
  authState.auth = { isAuthenticated: false, isAdmin: false }
  authState.isLoading = false
})

describe('RedirectIfAuthenticated', () => {
  it('renders children when the user is logged out', () => {
    renderGuestPage()

    expect(screen.getByRole('form', { name: 'guest-page' })).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('shows a loading spinner while auth state is initially resolving', () => {
    authState.isLoading = true
    renderGuestPage()

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('keeps children mounted during a login attempt after initial resolution', () => {
    // Initial resolution: loading finishes, page renders.
    const { rerender } = renderGuestPage()
    expect(screen.getByRole('form', { name: 'guest-page' })).toBeInTheDocument()

    // login() flips isLoading=true while the form is still mounted.
    authState.isLoading = true
    rerender(
      <RedirectIfAuthenticated>
        <form aria-label="guest-page">Guest content</form>
      </RedirectIfAuthenticated>,
    )

    // Form must stay mounted so its error state survives a failed login.
    expect(screen.getByRole('form', { name: 'guest-page' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('redirects an authenticated non-admin user to /challenges', async () => {
    authState.auth = { isAuthenticated: true, isAdmin: false }
    renderGuestPage()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/challenges'))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('redirects an authenticated admin user to /admin', async () => {
    authState.auth = { isAuthenticated: true, isAdmin: true }
    renderGuestPage()

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin'))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('shows a spinner first, then redirects on a hard load with a valid session', async () => {
    // Simulate a full page load: auth is still being resolved...
    authState.isLoading = true
    const { rerender } = renderGuestPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(replaceMock).not.toHaveBeenCalled()

    // ...then checkAuth resolves to an authenticated admin.
    authState.isLoading = false
    authState.auth = { isAuthenticated: true, isAdmin: true }
    rerender(
      <RedirectIfAuthenticated>
        <form aria-label="guest-page">Guest content</form>
      </RedirectIfAuthenticated>,
    )

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin'))
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
  })

  it('does not redirect a logged-out user after auth resolution', async () => {
    // Hard load for a logged-out user: spinner first, then the form.
    authState.isLoading = true
    const { rerender } = renderGuestPage()
    expect(screen.getByRole('status')).toBeInTheDocument()

    authState.isLoading = false
    rerender(
      <RedirectIfAuthenticated>
        <form aria-label="guest-page">Guest content</form>
      </RedirectIfAuthenticated>,
    )

    expect(screen.getByRole('form', { name: 'guest-page' })).toBeInTheDocument()
    await waitFor(() => expect(replaceMock).not.toHaveBeenCalled())
  })
})
