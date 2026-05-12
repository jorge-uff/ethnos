'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'

export default function CreateGamePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/login')
    } else {
      setReady(true)
    }
  }, [router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    try {
      const game = await api.post<{ id: string }>('/games', {
        maxPlayers: Number(form.get('maxPlayers')),
      })
      router.push(`/game/${game.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  if (!ready) return null

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Link href="/lobby" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-white">New Game</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Number of players</label>
            <select
              name="maxPlayers"
              defaultValue="4"
              className="px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>
                  {n} players {n <= 3 ? '(2 ages)' : '(3 ages)'}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
      </div>
    </main>
  )
}
