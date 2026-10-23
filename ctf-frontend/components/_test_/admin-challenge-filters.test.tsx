import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ChallengeTable from '@/components/admin/challenge-table'
import type { Challenge } from '@/lib/types'

const challenges: Challenge[] = [
  {
    id: 'crypto-1',
    title: 'Old Cipher',
    description: 'Decode the ancient message.',
    category: 'cryptography',
    difficulty: 'easy',
    points: 100,
    solved: false,
    requiresInstance: false,
  },
  {
    id: 'web-1',
    title: 'Web Exploit',
    description: 'Find the injection.',
    category: 'web-exploitation',
    difficulty: 'medium',
    points: 200,
    solved: false,
    requiresInstance: true,
  },
  {
    id: 'rev-1',
    title: 'Reverse Me',
    description: 'Inspect the binary.',
    category: 'reverse-engineering',
    difficulty: 'hard',
    points: 300,
    solved: false,
    requiresInstance: false,
  },
]

function search(value: string) {
  fireEvent.change(screen.getByLabelText('Search challenges by title or ID'), { target: { value } })
}

afterEach(cleanup)

describe('admin challenge filters', () => {
  it('searches by title and by ID', () => {
    render(<ChallengeTable challenges={challenges} />)

    search('web')
    expect(screen.getByText('Web Exploit')).toBeInTheDocument()
    expect(screen.queryByText('Old Cipher')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 3 challenges')).toBeInTheDocument()

    search('rev-1')
    expect(screen.getByText('Reverse Me')).toBeInTheDocument()
    expect(screen.queryByText('Web Exploit')).not.toBeInTheDocument()
  })

  it('filters by multiple difficulties', () => {
    render(<ChallengeTable challenges={challenges} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'easy' }))
    fireEvent.click(screen.getByRole('button', { name: 'hard' }))

    expect(screen.getByText('Old Cipher')).toBeInTheDocument()
    expect(screen.getByText('Reverse Me')).toBeInTheDocument()
    expect(screen.queryByText('Web Exploit')).not.toBeInTheDocument()
    expect(screen.getByText('2 of 3 challenges')).toBeInTheDocument()
  })

  it('combines category and type filters and clears them', () => {
    render(<ChallengeTable challenges={challenges} />)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.click(screen.getByRole('button', { name: 'web exploitation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Instance' }))
    expect(screen.getByText('Web Exploit')).toBeInTheDocument()
    expect(screen.getByText('1 of 3 challenges')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Instance' }))
    fireEvent.click(screen.getByRole('button', { name: 'hard' }))
    expect(screen.getByText('No challenges match your filters')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getAllByText(/Old Cipher|Web Exploit|Reverse Me/)).toHaveLength(3)
    expect(screen.getByText('3 of 3 challenges')).toBeInTheDocument()
  })
})
