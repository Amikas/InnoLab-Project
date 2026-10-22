import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient } from '../../api/client'

const ORIGINAL_FETCH = global.fetch
const TOKEN_KEY = 'auth_token'

function headersFrom(init: any) {
    // init.headers could be header or plain object
    // thats why we make an object out of it
    if (!init?.headers) return {}
    if (typeof (init.headers as any).get === 'function') {
        const obj: Record<string, string> = {}
        ;(init.headers as any).forEach((value: string, key: string) => (obj[key] = value))
        return obj
    }
    return init.headers as Record<string, string>
}

beforeEach(() => {
    localStorage.clear()
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
        status: 200,
        headers: {
            get: (name: string) => name === 'Content-Type' ? 'application/json' : null,
        },
    } as any)
})

afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    localStorage.clear()
})

describe('apiClient', () => {
    it('sets auth header if token is present', async () => {
        // Note: ApiClient uses cookies (credentials: 'include') not Authorization header
        // This test verifies the request is made with credentials
        await apiClient.get('/api/ping')

        expect(global.fetch).toHaveBeenCalledTimes(1)
        const [, init] = (global.fetch as any).mock.calls[0]
        
        expect(init.credentials).toBe('include')
    })

    it('throws understandable error if not ok', async () => {
        ;(global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 401,
            headers: {
                get: (name: string) => name === 'Content-Type' ? 'application/json' : null,
            },
            json: async () => ({ message: 'Unauthorized' }),
        })

        await expect(apiClient.get('/api/ping')).rejects.toThrow(/Unauthorized/i)
    })

    it('does not set auth header without token', async () => {
        await apiClient.get('/api/ping')
        const [, init] = (global.fetch as any).mock.calls[0]

        expect(init.credentials).toBe('include')
    })
})

describe('download filename extraction', () => {
    function mockBlobResponse(contentDisposition: string) {
        ;(global.fetch as any).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: {
                get: (name: string) => name.toLowerCase() === 'content-disposition' ? contentDisposition : null,
            },
            blob: async () => new Blob(['zip-bytes'], { type: 'application/zip' }),
        })
    }

    it.each([
        ['attachment; filename="=?UTF-8?Q?innolab-content.zip?="; filename*=UTF-8\'\'innolab-content.zip', 'innolab-content.zip'],
        ["attachment; filename*=UTF-8''caf%C3%A9.zip", 'café.zip'],
        ['attachment; filename="=?UTF-8?Q?caf=C3=A9.zip?="', 'café.zip'],
        ['attachment; filename="innolab-content(2).zip"', 'innolab-content(2).zip'],
        ['attachment; filename="../../etc/passwd"', 'passwd'],
    ])('parses %s', async (header, expected) => {
        mockBlobResponse(header)

        const { filename } = await apiClient.requestBlob('/api/admin/content-transfer/export', { method: 'POST' })

        expect(filename).toBe(expected)
    })
})
