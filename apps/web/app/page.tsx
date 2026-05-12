import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white gap-6">
      <h1 className="text-5xl font-bold tracking-tight">Ethnos</h1>
      <p className="text-gray-400 text-lg">A digital adaptation of the board game</p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors"
        >
          Register
        </Link>
      </div>
    </main>
  )
}
