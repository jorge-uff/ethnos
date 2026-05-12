'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { getSession, clearSession, AuthUser } from '@/lib/auth'

interface Player {
  id: string
  color: string
  username: string
}

interface Game {
  id: string
  name: string
  status: string
  totalAges: number
  players: Player[]
  createdAt: string
}

export default function LobbyPage() {
  const router = useRouter()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  const fetchGames = useCallback(async () => {
    try {
      const data = await api.get<Game[]>('/games')
      setGames(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setUser(session.user)
    fetchGames()
    const interval = setInterval(fetchGames, 5000)
    return () => clearInterval(interval)
  }, [router, fetchGames])

  async function joinGame(gameId: string) {
    setJoining(gameId)
    try {
      await api.post(`/games/${gameId}/join`, {})
      router.push(`/game/${gameId}`)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to join')
    } finally {
      setJoining(null)
    }
  }

  function logout() {
    clearSession()
    router.push('/login')
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Ethnos</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user.username}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Open Games</h2>
          <Link
            href="/lobby/create"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
          >
            + New Game
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">No open games</p>
            <p className="text-sm">Create one to get started</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {games.map((game) => {
              const isInGame = game.players.some(p => p.username === user.username)
              const isFull = game.players.length >= 6

              return (
                <li
                  key={game.id}
                  className="bg-gray-900 rounded-xl p-5 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{game.name}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      por {game.players[0]?.username} · {game.players.length} jogador{game.players.length !== 1 ? 'es' : ''} · {game.totalAges} eras
                    </p>
                    <div className="flex gap-2 mt-2">
                      {game.players.map(p => (
                        <span
                          key={p.id}
                          className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-300"
                        >
                          {p.username}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isInGame ? (
                    <Link
                      href={`/game/${game.id}`}
                      className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                    >
                      Rejoin
                    </Link>
                  ) : isFull ? (
                    <span className="text-sm text-gray-500">Full</span>
                  ) : (
                    <button
                      onClick={() => joinGame(game.id)}
                      disabled={joining === game.id}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                    >
                      {joining === game.id ? 'Joining...' : 'Join'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
