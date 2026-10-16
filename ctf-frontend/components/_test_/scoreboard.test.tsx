import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import Scoreboard from '../scoreboard'
import { getTopSolvers } from '@/lib/api/solves'
import { getDictionary } from '@/lib/i18n/dictionaries'

vi.mock('@/lib/api/solves', () => ({ getTopSolvers: vi.fn() }))

const labels = getDictionary('en').scoreboard

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Scoreboard', () => {
  it('loads real user entries and renders ranks and solve counts', async () => {
    vi.mocked(getTopSolvers).mockResolvedValue({
      success: true,
      data: [{ username: 'alice', solveCount: 3 }, { username: 'bob', solveCount: 1 }],
    })

    render(<Scoreboard labels={labels} />)
    expect(screen.getByRole('status')).toHaveTextContent(labels.loading)

    const table = await screen.findByRole('table', { name: labels.title })
    const rows = within(table).getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['1', '3'])
    expect(within(rows[1]).getByRole('rowheader')).toHaveTextContent('alice')
    expect(within(rows[2]).getAllByRole('cell').map(cell => cell.textContent)).toEqual(['2', '1'])
    expect(within(rows[2]).getByRole('rowheader')).toHaveTextContent('bob')
    expect(getTopSolvers).toHaveBeenCalledWith(100)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows an empty state when nobody has solved a challenge', async () => {
    vi.mocked(getTopSolvers).mockResolvedValue({ success: true, data: [] })
    render(<Scoreboard labels={labels} />)

    expect(await screen.findByText(labels.empty)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a localized error instead of fake results when the API fails', async () => {
    vi.mocked(getTopSolvers).mockResolvedValue({ success: false, error: 'Request failed (500)' })
    const germanLabels = getDictionary('de').scoreboard
    render(<Scoreboard labels={germanLabels} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(germanLabels.error)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText(germanLabels.empty)).not.toBeInTheDocument()
  })
})
