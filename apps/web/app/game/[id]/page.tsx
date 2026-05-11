'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Card {
  id: number
  type: 'ALLY' | 'DRAGON'
  tribe: string | null
  color: string | null
}

interface Kingdom {
  name: string
  color: string
  tokens: { age1: [number]; age2: [number, number]; age3: [number, number, number] }
  markers: Record<string, number>
}

interface Band {
  id: string
  cards: Card[]
  leaderId: number
  kingdomColor: string | null
}

interface Player {
  id: string
  userId: string
  username: string
  color: string
  glory: number
  gloryFromKingdoms: number
  gloryFromBands: number
  hand: Card[]
  bands: Band[]
}

interface GameState {
  id: string
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED'
  age: number
  totalAges: number
  activeTribes: string[]
  market: Card[]
  kingdoms: Kingdom[]
  players: Player[]
  activePlayerId: string | null
  dragonsRevealed: number
  deckSize: number
}

// ─── Color mappings ───────────────────────────────────────────────────────────

const KINGDOM_LABELS: Record<string, string> = {
  ORANGE: 'Ithys', BLUE: 'Straton', RED: 'Rhea',
  PURPLE: 'Duris', GREEN: 'Althea', GRAY: 'Pelagon',
}

const CARD_BG: Record<string, string> = {
  ORANGE: 'bg-orange-500', BLUE: 'bg-blue-500',   RED: 'bg-red-500',
  PURPLE: 'bg-purple-500', GREEN: 'bg-green-500', GRAY: 'bg-gray-400',
}

const TRIBE_LABELS: Record<string, string> = {
  CENTAURS: 'Centaurs', DWARVES: 'Dwarves',   ELVES: 'Elves',
  GIANTS: 'Giants',     HALFLINGS: 'Halflings', MERFOLK: 'Merfolk',
  MINOTAURS: 'Minotaurs', ORCS: 'Orcs',       SKELETONS: 'Skeletons',
  TROLLS: 'Trolls',    WINGFOLK: 'Wingfolk',   WIZARDS: 'Wizards',
}

const KINGDOM_COLORS = ['ORANGE', 'BLUE', 'RED', 'PURPLE', 'GREEN', 'GRAY']

// ─── CardPill ─────────────────────────────────────────────────────────────────

function CardPill({
  card,
  small = false,
  selected = false,
  selectable = false,
  disabled = false,
  onClick,
}: {
  card: Card
  small?: boolean
  selected?: boolean
  selectable?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  if (card.type === 'DRAGON') {
    return (
      <div
        onClick={onClick}
        className={`${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-red-900 border border-red-500 rounded-lg font-bold text-red-300 ${selectable ? 'cursor-pointer' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Dragon
      </div>
    )
  }
  const bg = card.color ? CARD_BG[card.color] : 'bg-gray-600'
  return (
    <div
      onClick={onClick}
      className={`
        ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        ${bg} rounded-lg font-medium text-white shadow
        ${selectable ? 'cursor-pointer hover:opacity-80' : ''}
        ${selected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {card.tribe ? TRIBE_LABELS[card.tribe] : '?'}
    </div>
  )
}

// ─── Band validator ───────────────────────────────────────────────────────────

function isValidBand(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const tribes = new Set(cards.map(c => c.tribe).filter(Boolean))
  const colors = new Set(cards.map(c => c.color).filter(Boolean))
  const allSameTribe = tribes.size === 1 && cards.every(c => c.tribe)
  const allSameColor = colors.size === 1 && cards.every(c => c.color)
  return allSameTribe || allSameColor
}

function bandKingdomColor(cards: Card[], leaderId: number): string | null {
  const colors = new Set(cards.map(c => c.color).filter(Boolean))
  if (colors.size === 1) return [...colors][0] as string
  const leader = cards.find(c => c.id === leaderId)
  return leader?.color ?? null
}

// ─── Play Band Modal ──────────────────────────────────────────────────────────

function PlayBandModal({
  selected,
  myPlayer,
  onConfirm,
  onCancel,
}: {
  selected: Card[]
  myPlayer: Player
  onConfirm: (leaderId: number, kingdomColor: string) => void
  onCancel: () => void
}) {
  const [leaderId, setLeaderId] = useState<number>(selected[0]?.id)
  const [kingdom, setKingdom] = useState<string>('')

  const colors = new Set(selected.map(c => c.color).filter(Boolean))
  const allSameColor = colors.size === 1 && selected.every(c => c.color)
  const autoKingdom = allSameColor ? [...colors][0] as string : null

  // When leader changes, auto-set kingdom if same-color band
  const effectiveKingdom = autoKingdom ?? kingdom

  const canSubmit = leaderId && (autoKingdom || kingdom)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">Play Band</h3>

        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Cards in band</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(c => <CardPill key={c.id} card={c} />)}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Choose leader</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(c => (
              <button
                key={c.id}
                onClick={() => setLeaderId(c.id)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  leaderId === c.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {c.tribe ? TRIBE_LABELS[c.tribe] : 'Dragon'} ({c.color})
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Target kingdom</p>
          {autoKingdom ? (
            <p className="text-sm text-gray-300">
              {KINGDOM_LABELS[autoKingdom]} (determined by card color)
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {KINGDOM_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setKingdom(c)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    kingdom === c ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {KINGDOM_LABELS[c]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => canSubmit && onConfirm(leaderId, effectiveKingdom)}
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            Play Band
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Waiting room ─────────────────────────────────────────────────────────────

function WaitingRoom({ game, isCreator, onStart }: {
  game: GameState
  isCreator: boolean
  onStart: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-8 py-16">
      <h2 className="text-2xl font-semibold">Waiting for players...</h2>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <p className="text-gray-400 text-sm mb-4">
          {game.players.length} / 6 players · {game.totalAges} ages
        </p>
        <ul className="flex flex-col gap-3">
          {game.players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span>{p.username}</span>
              {i === 0 && <span className="text-xs text-yellow-400 ml-auto">Creator</span>}
            </li>
          ))}
        </ul>
      </div>

      {isCreator && (
        <button
          onClick={onStart}
          disabled={game.players.length < 2}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold text-lg transition-colors"
        >
          {game.players.length < 2 ? 'Need at least 2 players' : 'Start Game'}
        </button>
      )}
      {!isCreator && (
        <p className="text-gray-500 text-sm">Waiting for the creator to start...</p>
      )}
    </div>
  )
}

// ─── Glory breakdown ───────────────────────────────────────────────────────────

function gloryKingdoms(p: Player): number {
  return p.gloryFromKingdoms ?? 0
}

function gloryBands(p: Player): number {
  return p.gloryFromBands ?? 0
}

function PlayerGlorySplit({ player, size = 'md' }: { player: Player; size?: 'sm' | 'md' }) {
  const k = gloryKingdoms(player)
  const b = gloryBands(player)
  const t = player.glory
  const textMain = size === 'md' ? 'text-sm' : 'text-xs'
  const textTotal = size === 'md' ? 'text-lg' : 'text-sm'
  return (
    <div className={`text-right ${textMain} text-gray-400 leading-tight`}>
      <div>
        Reinos <span className="text-amber-200/90 tabular-nums">{k}</span>
        <span className="mx-1.5 text-gray-600">·</span>
        Bandos <span className="text-amber-200/90 tabular-nums">{b}</span>
      </div>
      <div className={`text-yellow-400 font-bold tabular-nums ${textTotal}`}>{t} ✨</div>
    </div>
  )
}

// ─── Finished screen ──────────────────────────────────────────────────────────

function FinishedScreen({ game }: { game: GameState }) {
  const sorted = [...game.players].sort((a, b) => b.glory - a.glory)
  return (
    <div className="flex flex-col items-center gap-8 py-16">
      <h2 className="text-2xl font-semibold">Game Over</h2>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <ul className="flex flex-col gap-4">
          {sorted.map((p, i) => (
            <li key={p.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </span>
                <span className="font-medium truncate">{p.username}</span>
                {i === 0 && <span className="text-xs text-yellow-400 shrink-0">Winner</span>}
              </div>
              <PlayerGlorySplit player={p} size="md" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Game board ───────────────────────────────────────────────────────────────

function GameBoard({
  game,
  myPlayer,
  isMyTurn,
  onAction,
}: {
  game: GameState
  myPlayer: Player | undefined
  isMyTurn: boolean
  onAction: (action: object) => void
}) {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set())
  const [showBandModal, setShowBandModal] = useState(false)
  const [busy, setBusy] = useState(false)

  const activePlayer = game.players.find(p => p.id === game.activePlayerId)
  const selectedCards = (myPlayer?.hand ?? []).filter(c => selectedCardIds.has(c.id))
  const validBand = isValidBand(selectedCards)
  const handFull = !!(myPlayer && myPlayer.hand.length >= 10)
  const marketRecruitDisabled = busy || handFull

  async function send(action: object) {
    if (busy) return
    setBusy(true)
    try {
      await onAction(action)
    } finally {
      setBusy(false)
      setSelectedCardIds(new Set())
    }
  }

  function toggleCard(card: Card) {
    if (!isMyTurn) return
    setSelectedCardIds(prev => {
      const next = new Set(prev)
      next.has(card.id) ? next.delete(card.id) : next.add(card.id)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900 rounded-xl px-6 py-4">
        <div className="flex gap-6 text-sm">
          <span className="text-gray-400">Age <span className="text-white font-bold">{game.age}</span> / {game.totalAges}</span>
          <span className="text-gray-400">Dragons <span className="text-red-400 font-bold">{game.dragonsRevealed}</span> / 3</span>
          <span className="text-gray-400">Deck <span className="text-white font-bold">{game.deckSize}</span></span>
        </div>
        <div className="text-sm">
          {activePlayer && (
            <span className={activePlayer.id === myPlayer?.id ? 'text-green-400 font-bold' : 'text-gray-300'}>
              {activePlayer.id === myPlayer?.id ? 'Your turn' : `${activePlayer.username}'s turn`}
            </span>
          )}
        </div>
      </div>

      {/* Action bar — only for active player */}
      {isMyTurn && (
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
          <span className="text-indigo-300 text-sm font-medium mr-2">Your turn:</span>
          <button
            onClick={() => send({ type: 'RECRUIT_FROM_DECK' })}
            disabled={busy || handFull}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            Draw from deck
          </button>
          {handFull && (
            <span className="text-xs text-amber-300">Hand full</span>
          )}
          {selectedCardIds.size > 0 && (
            <button
              onClick={() => validBand ? setShowBandModal(true) : null}
              disabled={!validBand || busy}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Play band ({selectedCardIds.size} cards){!validBand && ' — invalid'}
            </button>
          )}
          {selectedCardIds.size > 0 && (
            <button
              onClick={() => setSelectedCardIds(new Set())}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-indigo-400 ml-auto">
            Click market cards to recruit · Select hand cards to form a band
          </span>
        </div>
      )}

      {/* Tribes in play */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Tribes in play</p>
        <div className="flex flex-wrap gap-2">
          {game.activeTribes.map(t => (
            <span key={t} className="px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300">
              {TRIBE_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      {/* Kingdoms */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Kingdoms</p>
        <div className="grid grid-cols-3 gap-3">
          {game.kingdoms.map(k => (
            <div key={k.name} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${CARD_BG[k.color]}`} />
                <span className="text-sm font-medium">{KINGDOM_LABELS[k.color]}</span>
              </div>
              <div className="text-xs text-gray-400 mb-2 leading-snug">
                <span title="Era 1 — 1st place">I: {k.tokens.age1[0]}</span>
                {' · '}
                <span title="Era 2 — 1st/2nd place">II: {k.tokens.age2[0]}/{k.tokens.age2[1]}</span>
                {' · '}
                <span title="Era 3 — 1st/2nd/3rd place">III: {k.tokens.age3[0]}/{k.tokens.age3[1]}/{k.tokens.age3[2]}</span>
              </div>
              <div className="flex flex-col gap-1">
                {game.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className={p.id === myPlayer?.id ? 'text-indigo-300' : 'text-gray-400'}>
                      {p.username}
                    </span>
                    <span className="font-mono text-white">{k.markers[p.id] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
          Market ({game.market.length} cards){isMyTurn && !handFull && ' — click to recruit'}
          {isMyTurn && handFull && ' — hand full'}
        </p>
        <div className="flex flex-wrap gap-2">
          {game.market.length === 0
            ? <span className="text-gray-600 text-sm">Empty</span>
            : game.market.map(c => (
                <CardPill
                  key={c.id}
                  card={c}
                  selectable={isMyTurn && !marketRecruitDisabled && c.type !== 'DRAGON'}
                  disabled={isMyTurn && marketRecruitDisabled && c.type !== 'DRAGON'}
                  onClick={isMyTurn && !marketRecruitDisabled && c.type !== 'DRAGON' ? () => send({ type: 'RECRUIT_FROM_MARKET', cardId: c.id }) : undefined}
                />
              ))
          }
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {game.players.map(p => {
          const isMe = p.id === myPlayer?.id
          return (
            <div
              key={p.id}
              className={`bg-gray-900 rounded-xl p-4 ${p.id === game.activePlayerId ? 'ring-2 ring-indigo-500' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold ${isMe ? 'text-indigo-300' : 'text-white'}`}>
                  {p.username} {isMe && '(you)'}
                </span>
                <PlayerGlorySplit player={p} size="sm" />
              </div>

              {isMe ? (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Hand ({p.hand.length}/10){isMyTurn ? ' — click to select for band' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {p.hand.length === 0
                      ? <span className="text-gray-600 text-xs">Empty</span>
                      : p.hand.map(c => (
                          <CardPill
                            key={c.id}
                            card={c}
                            small
                            selectable={isMyTurn}
                            selected={selectedCardIds.has(c.id)}
                            onClick={isMyTurn ? () => toggleCard(c) : undefined}
                          />
                        ))
                    }
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mb-3">{p.hand.length} cards in hand</p>
              )}

              {p.bands.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bands ({p.bands.length})</p>
                  {p.bands.map(b => (
                    <div key={b.id} className="flex flex-wrap gap-1 mb-1">
                      {b.cards.map(c => <CardPill key={c.id} card={c} small />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showBandModal && myPlayer && (
        <PlayBandModal
          selected={selectedCards}
          myPlayer={myPlayer}
          onConfirm={(leaderId, kingdomColor) => {
            setShowBandModal(false)
            send({ type: 'PLAY_BAND', cardIds: [...selectedCardIds], leaderId, kingdomColor })
          }}
          onCancel={() => setShowBandModal(false)}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GamePage() {
  const router = useRouter()
  const params = useParams()
  const gameId = params.id as string

  const [game, setGame] = useState<GameState | null>(null)
  const [myPlayer, setMyPlayer] = useState<Player | undefined>(undefined)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [error, setError] = useState('')

  const fetchGame = useCallback(async () => {
    try {
      const data = await api.get<GameState>(`/games/${gameId}`)
      setGame(data)
    } catch {
      setError('Game not found')
    }
  }, [gameId])

  useEffect(() => {
    const session = getSession()
    if (!session) { router.push('/login'); return }

    fetchGame()

    const s = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
    s.emit('game:join', gameId)
    s.on('game:state', (state: GameState) => setGame(state))
    setSocket(s)

    return () => { s.disconnect() }
  }, [gameId, router, fetchGame])

  useEffect(() => {
    if (!game) return
    const session = getSession()
    if (!session) return
    const me = game.players.find(p => p.userId === session.user.id || p.username === session.user.username)
    setMyPlayer(me)
  }, [game])

  async function startGame() {
    try {
      await api.post(`/games/${gameId}/start`, {})
      await fetchGame()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to start game')
    }
  }

  async function sendAction(action: object) {
    try {
      const data = await api.post<GameState>(`/games/${gameId}/action`, action)
      setGame(data)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed')
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/lobby')} className="text-indigo-400 hover:underline">
            Back to lobby
          </button>
        </div>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  const session = getSession()
  const isCreator = game.players[0]?.username === session?.user.username
  const isMyTurn = !!(myPlayer && game.activePlayerId === myPlayer.id && game.status === 'IN_PROGRESS')

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-8 py-4 border-b border-gray-800">
        <button onClick={() => router.push('/lobby')} className="text-gray-400 hover:text-white text-sm">
          ← Lobby
        </button>
        <h1 className="text-lg font-bold">Ethnos</h1>
        <span className="text-sm text-gray-400">{session?.user.username}</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {game.status === 'WAITING' ? (
          <WaitingRoom game={game} isCreator={isCreator} onStart={startGame} />
        ) : game.status === 'FINISHED' ? (
          <FinishedScreen game={game} />
        ) : (
          <GameBoard
            game={game}
            myPlayer={myPlayer}
            isMyTurn={isMyTurn}
            onAction={sendAction}
          />
        )}
      </div>
    </main>
  )
}
