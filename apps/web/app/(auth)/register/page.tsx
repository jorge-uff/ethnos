'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import { saveSession } from '@/lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)

    try {
      const res = await api.post<{ token: string; user: { id: string; username: string } }>(
        '/auth/register',
        {
          username: form.get('username'),
          email: form.get('email'),
          password: form.get('password'),
        }
      )
      saveSession(res.token, res.user)
      router.push('/lobby')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm bg-gray-900 rounded-xl p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
            minLength={3}
            maxLength={20}
            className="px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="px-4 py-3 bg-gray-800 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}
