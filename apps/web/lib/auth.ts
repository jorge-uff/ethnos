'use client'

export interface AuthUser {
  id: string
  username: string
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem('ethnos_token', token)
  localStorage.setItem('ethnos_user', JSON.stringify(user))
}

export function getSession(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem('ethnos_token')
  const raw = localStorage.getItem('ethnos_user')
  if (!token || !raw) return null
  return { token, user: JSON.parse(raw) }
}

export function clearSession() {
  localStorage.removeItem('ethnos_token')
  localStorage.removeItem('ethnos_user')
}
