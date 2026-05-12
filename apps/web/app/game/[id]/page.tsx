'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { api } from '@/lib/api'
import { getSession } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgeKingdomPlacement {
  playerId: string
  username: string
  markers: number
  reward: number
}

interface AgeKingdomResult {
  kingdomColor: string
  placements: AgeKingdomPlacement[]
}

interface AgePlayerScore {
  playerId: string
  username: string
  gloryFromKingdoms: number
  gloryFromBands: number
  totalGlory: number
}

interface AgeEndedPayload {
  age: number
  kingdomResults: AgeKingdomResult[]
  playerScores: AgePlayerScore[]
}

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
  totalMarkers: number
  lastAgeBandSizes: number[]
  // Tribe power state
  merfolkPosition: number
  orcHorde: number
  trollTokens: number
}

interface GiantToken {
  heldByPlayerId: string
  bandSize: number
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
  giantToken: GiantToken | null
  orcPowerPlayerId: string | null
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
  CENTAURS: 'Centauros', DWARVES: 'Anões',      ELVES: 'Elfos',
  GIANTS: 'Gigantes',    HALFLINGS: 'Halflings', MERFOLK: 'Sereias',
  MINOTAURS: 'Minotauros', ORCS: 'Orcs',        SKELETONS: 'Esqueletos',
  TROLLS: 'Trolls',     WINGFOLK: 'Alados',      WIZARDS: 'Magos',
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

// ─── Band validator (Halflings-aware) ─────────────────────────────────────────

function isValidBand(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const hasHalflings = cards.some(c => c.tribe === 'HALFLINGS')
  const check = hasHalflings ? cards.filter(c => c.tribe !== 'HALFLINGS') : cards
  if (check.length === 0) return true  // all Halflings
  const tribes = new Set(check.map(c => c.tribe).filter(Boolean))
  const colors = new Set(check.map(c => c.color).filter(Boolean))
  return (tribes.size === 1 && check.every(c => c.tribe)) ||
         (colors.size === 1 && check.every(c => c.color))
}

function bandKingdomColor(cards: Card[], leaderId: number): string | null {
  const hasHalflings = cards.some(c => c.tribe === 'HALFLINGS')
  const checkCards = hasHalflings ? cards.filter(c => c.tribe !== 'HALFLINGS') : cards
  const effective = checkCards.length > 0 ? checkCards : cards
  const colors = new Set(effective.map(c => c.color).filter(Boolean))
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
  onConfirm: (leaderId: number, kingdomColor: string, powerKingdomColor?: string, trollKingdomColor?: string) => void
  onCancel: () => void
}) {
  const [leaderId, setLeaderId] = useState<number>(selected[0]?.id)
  const [kingdom, setKingdom] = useState<string>('')
  const [powerKingdom, setPowerKingdom] = useState<string>('')
  const [trollKingdom, setTrollKingdom] = useState<string>('')

  const leader = selected.find(c => c.id === leaderId)
  const leaderTribe = leader?.tribe ?? null

  // Halflings-aware auto-kingdom detection
  const hasHalflings = selected.some(c => c.tribe === 'HALFLINGS')
  const nonHalflings = hasHalflings ? selected.filter(c => c.tribe !== 'HALFLINGS') : selected
  const checkCards = nonHalflings.length > 0 ? nonHalflings : selected
  const colorsSet = new Set(checkCards.map(c => c.color).filter(Boolean))
  const allSameColor = colorsSet.size === 1 && checkCards.every(c => c.color)

  // Power-specific flags
  const isMonotribeWingfolk = leaderTribe === 'WINGFOLK' && selected.every(c => c.tribe === 'WINGFOLK')
  const isMino = leaderTribe === 'MINOTAURS'
  const isTroll = leaderTribe === 'TROLLS'

  // For Minotaurs/Wingfolk: power kingdom replaces normal kingdom selection
  const needsPowerKingdom = isMino || isMonotribeWingfolk
  // Auto kingdom when not overridden by a power
  const autoKingdom = allSameColor && !needsPowerKingdom ? [...colorsSet][0] as string : null
  const needsNormalKingdom = !needsPowerKingdom && !autoKingdom

  const effectiveKingdom = autoKingdom ?? kingdom

  const canSubmit = !!leaderId &&
    (!needsPowerKingdom || !!powerKingdom) &&
    (!needsNormalKingdom || !!kingdom) &&
    (!isTroll || !!trollKingdom)

  function handleConfirm() {
    if (!canSubmit) return
    const k = needsPowerKingdom ? powerKingdom : effectiveKingdom
    onConfirm(
      leaderId,
      k,
      needsPowerKingdom ? powerKingdom : undefined,
      isTroll ? trollKingdom : undefined,
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold mb-4">Jogar Bando</h3>

        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Cartas no bando</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(c => <CardPill key={c.id} card={c} />)}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Escolha o Líder</p>
          <div className="flex flex-wrap gap-2">
            {selected.map(c => (
              <button
                key={c.id}
                onClick={() => { setLeaderId(c.id); setPowerKingdom('') }}
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

        {/* Normal kingdom selection */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Reino alvo</p>
          {autoKingdom ? (
            <p className="text-sm text-gray-300">
              {KINGDOM_LABELS[autoKingdom]} (determinado pela cor das cartas)
            </p>
          ) : !needsPowerKingdom ? (
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
          ) : null}
        </div>

        {/* Minotaurs / Wingfolk: free kingdom choice */}
        {needsPowerKingdom && (
          <div className="mb-4 bg-yellow-950/40 border border-yellow-800/50 rounded-xl p-3">
            <p className="text-xs text-yellow-400 uppercase tracking-widest mb-2">
              {isMino ? 'Poder dos Minotauros' : 'Poder dos Alados'} — escolha o reino livremente
            </p>
            <div className="flex flex-wrap gap-2">
              {KINGDOM_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setPowerKingdom(c)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    powerKingdom === c ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {KINGDOM_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trolls: choose kingdom for troll tokens */}
        {isTroll && (
          <div className="mb-4 bg-purple-950/40 border border-purple-800/50 rounded-xl p-3">
            <p className="text-xs text-purple-400 uppercase tracking-widest mb-2">
              Poder dos Trolls — reino para os tokens de Troll
            </p>
            <div className="flex flex-wrap gap-2">
              {KINGDOM_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setTrollKingdom(c)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    trollKingdom === c ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {KINGDOM_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            Jogar Bando
          </button>
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold transition-colors"
          >
            Cancelar
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
      <h2 className="text-2xl font-semibold">Aguardando jogadores...</h2>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <p className="text-gray-400 text-sm mb-4">
          {game.players.length} / 6 jogadores · {game.totalAges} eras
        </p>
        <ul className="flex flex-col gap-3">
          {game.players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <span>{p.username}</span>
              {i === 0 && <span className="text-xs text-yellow-400 ml-auto">Criador</span>}
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
          {game.players.length < 2 ? 'Precisa de pelo menos 2 jogadores' : 'Iniciar Jogo'}
        </button>
      )}
      {!isCreator && (
        <p className="text-gray-500 text-sm">Aguardando o criador iniciar...</p>
      )}
    </div>
  )
}

// ─── Glory breakdown ───────────────────────────────────────────────────────────

function PlayerGlorySplit({ player, size = 'md' }: { player: Player; size?: 'sm' | 'md' }) {
  const k = player.gloryFromKingdoms ?? 0
  const b = player.gloryFromBands ?? 0
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

function compareLastAgeBands(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function FinishedScreen({ game }: { game: GameState }) {
  const sorted = [...game.players].sort((a, b) =>
    b.glory - a.glory ||
    b.totalMarkers - a.totalMarkers ||
    compareLastAgeBands(a.lastAgeBandSizes, b.lastAgeBandSizes)
  )
  return (
    <div className="flex flex-col items-center gap-8 py-16">
      <h2 className="text-2xl font-semibold">Fim de Jogo</h2>
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md">
        <ul className="flex flex-col gap-4">
          {sorted.map((p, i) => {
            const largestBand = p.lastAgeBandSizes[0] ?? 0
            return (
              <li key={p.id} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-700 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium truncate">{p.username}</span>
                  {i === 0 && <span className="text-xs text-yellow-400 shrink-0">Vencedor</span>}
                </div>
                <div className="text-right">
                  <PlayerGlorySplit player={p} size="md" />
                  <div className="text-[11px] text-gray-500 mt-1 leading-tight">
                    Marcadores <span className="text-gray-300 tabular-nums">{p.totalMarkers}</span>
                    <span className="mx-1.5 text-gray-700">·</span>
                    Maior bando <span className="text-gray-300 tabular-nums">{largestBand}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-gray-600 mt-4 text-center">
          Desempate: Glória → marcadores no tabuleiro → maior bando da última Era → próximos bandos
        </p>
      </div>
    </div>
  )
}

// ─── Age transition screen ────────────────────────────────────────────────────

function AgeTransitionScreen({ payload }: { payload: AgeEndedPayload }) {
  const [secondsLeft, setSecondsLeft] = useState(8)

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  const sorted = [...payload.playerScores].sort((a, b) => b.totalGlory - a.totalGlory)

  return (
    <div className="fixed inset-0 bg-gray-950/95 flex items-start justify-center z-40 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">

        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Era {payload.age} encerrada</h2>
          <p className="text-gray-400 text-sm">Próxima era em {secondsLeft}s...</p>
        </div>

        {payload.kingdomResults.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Pontuação de reinos</p>
            <div className="flex flex-col gap-5">
              {payload.kingdomResults.map(kr => (
                <div key={kr.kingdomColor}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${CARD_BG[kr.kingdomColor]}`} />
                    <span className="text-sm font-medium">{KINGDOM_LABELS[kr.kingdomColor]}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 pl-5">
                    {kr.placements.map((pl, i) => (
                      <div key={pl.playerId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-300">
                          <span className="text-gray-500 w-5 tabular-nums">{i + 1}º</span>
                          <span>{pl.username}</span>
                          <span className="text-gray-600 text-xs">({pl.markers} marcadores)</span>
                        </div>
                        <span className="text-yellow-400 font-semibold">+{pl.reward} ✨</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Placar acumulado</p>
          <div className="flex flex-col gap-4">
            {sorted.map((ps, i) => (
              <div key={ps.playerId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-medium">{ps.username}</span>
                </div>
                <div className="text-right text-sm text-gray-400 leading-tight">
                  <div>
                    Reinos <span className="text-amber-200/90 tabular-nums">+{ps.gloryFromKingdoms}</span>
                    <span className="mx-1.5 text-gray-600">·</span>
                    Bandos <span className="text-amber-200/90 tabular-nums">+{ps.gloryFromBands}</span>
                  </div>
                  <div className="text-yellow-400 font-bold text-lg tabular-nums">{ps.totalGlory} ✨</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Tribe power state badge ──────────────────────────────────────────────────

function TribePowerBadges({ player, game }: { player: Player; game: GameState }) {
  const isGiantHolder = game.giantToken?.heldByPlayerId === player.id
  const isOrcPlayer = game.orcPowerPlayerId === player.id

  if (!isGiantHolder && !isOrcPlayer && player.merfolkPosition === 0 &&
      player.orcHorde === 0 && player.trollTokens === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {isGiantHolder && (
        <span className="px-2 py-0.5 bg-amber-900/60 border border-amber-700/50 rounded text-xs text-amber-300">
          Token dos Gigantes
        </span>
      )}
      {player.merfolkPosition > 0 && (
        <span className="px-2 py-0.5 bg-blue-900/60 border border-blue-700/50 rounded text-xs text-blue-300">
          Sereias {player.merfolkPosition}/6
        </span>
      )}
      {player.orcHorde > 0 && (
        <span className="px-2 py-0.5 bg-green-900/60 border border-green-700/50 rounded text-xs text-green-300">
          Orc Horde: {player.orcHorde}
        </span>
      )}
      {isOrcPlayer && player.orcHorde === 0 && (
        <span className="px-2 py-0.5 bg-green-900/40 border border-green-800/40 rounded text-xs text-green-500">
          Orc ativo
        </span>
      )}
      {player.trollTokens > 0 && (
        <span className="px-2 py-0.5 bg-purple-900/60 border border-purple-700/50 rounded text-xs text-purple-300">
          Trolls: {player.trollTokens} tokens
        </span>
      )}
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
          <span className="text-gray-400">Era <span className="text-white font-bold">{game.age}</span> / {game.totalAges}</span>
          <span className="text-gray-400">Dragões <span className="text-red-400 font-bold">{game.dragonsRevealed}</span> / 3</span>
          <span className="text-gray-400">Deck <span className="text-white font-bold">{game.deckSize}</span></span>
        </div>
        <div className="text-sm">
          {activePlayer && (
            <span className={activePlayer.id === myPlayer?.id ? 'text-green-400 font-bold' : 'text-gray-300'}>
              {activePlayer.id === myPlayer?.id ? 'Seu turno' : `Vez de ${activePlayer.username}`}
            </span>
          )}
        </div>
      </div>

      {/* Giant token global indicator */}
      {game.giantToken && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
          <span className="text-amber-400 font-medium">Token dos Gigantes</span>
          <span className="text-gray-400">→</span>
          <span className="text-amber-200">
            {game.players.find(p => p.id === game.giantToken!.heldByPlayerId)?.username ?? '?'}
          </span>
          <span className="text-gray-600 text-xs ml-auto">bando de {game.giantToken.bandSize} cartas (+2 Glória no fim)</span>
        </div>
      )}

      {/* Action bar — only for active player */}
      {isMyTurn && (
        <div className="bg-indigo-950 border border-indigo-800 rounded-xl px-5 py-4 flex flex-wrap items-center gap-3">
          <span className="text-indigo-300 text-sm font-medium mr-2">Seu turno:</span>
          <button
            onClick={() => send({ type: 'RECRUIT_FROM_DECK' })}
            disabled={busy || handFull}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            Sacar do deck
          </button>
          {handFull && (
            <span className="text-xs text-amber-300">Mão cheia</span>
          )}
          {selectedCardIds.size > 0 && (
            <button
              onClick={() => validBand ? setShowBandModal(true) : null}
              disabled={!validBand || busy}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Jogar bando ({selectedCardIds.size} cartas){!validBand && ' — inválido'}
            </button>
          )}
          {selectedCardIds.size > 0 && (
            <button
              onClick={() => setSelectedCardIds(new Set())}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Limpar
            </button>
          )}
          <span className="text-xs text-indigo-400 ml-auto">
            Clique no mercado para recrutar · Selecione cartas da mão para formar bando
          </span>
        </div>
      )}

      {/* Tribes in play */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Tribos em jogo</p>
        <div className="flex flex-wrap gap-2">
          {game.activeTribes.map(t => (
            <span key={t} className="px-3 py-1 bg-gray-800 rounded-lg text-sm text-gray-300">
              {TRIBE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      </div>

      {/* Kingdoms */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Reinos</p>
        <div className="grid grid-cols-3 gap-3">
          {game.kingdoms.map(k => (
            <div key={k.name} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${CARD_BG[k.color]}`} />
                <span className="text-sm font-medium">{KINGDOM_LABELS[k.color]}</span>
              </div>
              <div className="text-xs text-gray-400 mb-2 leading-snug">
                <span title="Era 1 — 1º lugar">I: {k.tokens.age1[0]}</span>
                {' · '}
                <span title="Era 2 — 1º/2º lugar">II: {k.tokens.age2[0]}/{k.tokens.age2[1]}</span>
                {' · '}
                <span title="Era 3 — 1º/2º/3º lugar">III: {k.tokens.age3[0]}/{k.tokens.age3[1]}/{k.tokens.age3[2]}</span>
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
          Mercado ({game.market.length} cartas){isMyTurn && !handFull && ' — clique para recrutar'}
          {isMyTurn && handFull && ' — mão cheia'}
        </p>
        <div className="flex flex-wrap gap-2">
          {game.market.length === 0
            ? <span className="text-gray-600 text-sm">Vazio</span>
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
                  {p.username} {isMe && '(você)'}
                </span>
                <PlayerGlorySplit player={p} size="sm" />
              </div>

              {/* Tribe power state badges */}
              <TribePowerBadges player={p} game={game} />

              {isMe ? (
                <div className="mb-3 mt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Mão ({p.hand.length}/10){isMyTurn ? ' — clique para selecionar' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {p.hand.length === 0
                      ? <span className="text-gray-600 text-xs">Vazia</span>
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
                <p className="text-xs text-gray-500 mb-3 mt-2">{p.hand.length} cartas na mão</p>
              )}

              {p.bands.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bandos ({p.bands.length})</p>
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
          onConfirm={(leaderId, kingdomColor, powerKingdomColor, trollKingdomColor) => {
            setShowBandModal(false)
            send({
              type: 'PLAY_BAND',
              cardIds: [...selectedCardIds],
              leaderId,
              kingdomColor,
              ...(powerKingdomColor ? { powerKingdomColor } : {}),
              ...(trollKingdomColor ? { trollKingdomColor } : {}),
            })
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
  const [socket, setSocket] = useState<Socket | null>(null)
  const [error, setError] = useState('')
  const [ageTransition, setAgeTransition] = useState<AgeEndedPayload | null>(null)

  const fetchGame = useCallback(async () => {
    try {
      const data = await api.get<GameState>(`/games/${gameId}`)
      setGame(data)
    } catch {
      setError('Jogo não encontrado')
    }
  }, [gameId])

  useEffect(() => {
    const session = getSession()
    if (!session) { router.push('/login'); return }

    fetchGame()

    const s = io(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
    s.on('connect', () => {
      s.emit('game:join', gameId)
      fetchGame()
    })
    s.on('game:state', (state: GameState) => { setGame(state); setAgeTransition(null) })
    s.on('game:age-ended', (payload: AgeEndedPayload) => setAgeTransition(payload))
    setSocket(s)

    return () => { s.disconnect() }
  }, [gameId, router, fetchGame])

  async function startGame() {
    try {
      await api.post(`/games/${gameId}/start`, {})
      await fetchGame()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Falha ao iniciar jogo')
    }
  }

  async function sendAction(action: object) {
    try {
      const data = await api.post<GameState>(`/games/${gameId}/action`, action)
      setGame(data)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ação inválida')
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push('/lobby')} className="text-indigo-400 hover:underline">
            Voltar ao lobby
          </button>
        </div>
      </main>
    )
  }

  if (!game) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-gray-400">Carregando...</p>
      </main>
    )
  }

  const session = getSession()
  const myPlayer = game.players.find(p => p.userId === session?.user.id || p.username === session?.user.username)
  const isCreator = game.players[0]?.username === session?.user.username
  const isMyTurn = !!(myPlayer && game.activePlayerId === myPlayer.id && game.status === 'IN_PROGRESS')

  // suppress unused variable warning — socket is used for cleanup via effect
  void socket

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

      {ageTransition && <AgeTransitionScreen payload={ageTransition} />}
    </main>
  )
}
