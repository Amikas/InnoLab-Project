import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getMySolves, getRecentSolves, getTopSolvers } from '../../api/solves'

const ORIGINAL_FETCH = global.fetch

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: (name: string) => name === 'Content-Type' ? 'application/json' : null },
        json: async () => ([{ id: 1, username: 'u', challengeId: 'c', challengeTitle: 't', pointsEarned: 10, solvedAt: '2026-01-01T00:00:00' }]),
    } as any)
})

afterEach(() => {
    global.fetch = ORIGINAL_FETCH
})

describe('solves api', () => {
    it('returns body directly instead of response.data', async () => {
        const res = await getMySolves()
        expect(res.success).toBe(true)
        expect(Array.isArray(res.data)).toBe(true)
        expect((res.data as any)[0].challengeTitle).toBe('t')
    })

    it('sends limit as a query param', async () => {
        await getRecentSolves(5)
        const url = (global.fetch as any).mock.calls[0][0]
        expect(url).toContain('limit=5')
    })

    it('sorts top solvers by solve count and breaks ties by username', async () => {
        ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: { get: (name: string) => name === 'Content-Type' ? 'application/json' : null },
            json: async () => ({ bob: 1, charlie: 3, alice: 3 }),
        } as any)
        const res = await getTopSolvers(3)
        expect(res.success).toBe(true)
        expect(res.data).toEqual([
            { username: 'alice', solveCount: 3 },
            { username: 'charlie', solveCount: 3 },
            { username: 'bob', solveCount: 1 },
        ])
        const url = (global.fetch as any).mock.calls[0][0]
        expect(url).toContain('limit=3')
    })
})
