import { FullGameState, Card, KingdomColor, Band } from './types.js'
import { beginAge } from './setup.js'
import { applyLeaderPower } from './tribePowers.js'

// ─── Action types ─────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'RECRUIT_FROM_DECK' }
  | { type: 'RECRUIT_FROM_MARKET'; cardId: number }
  | {
      type: 'PLAY_BAND'
      cardIds: number[]
      leaderId: number
      kingdomColor?: string
      // Optional power overrides
      powerKingdomColor?: string   // free kingdom choice for Minotaurs / monotribe Wingfolk
      trollKingdomColor?: string   // kingdom for Troll token placement (unused server-side, accepted for future UI)
    }

export interface AgeKingdomPlacement {
  playerId: string
  markers: number
  reward: number
}

export interface AgeKingdomResult {
  kingdomColor: string
  placements: AgeKingdomPlacement[]
}

export interface AgeScoring {
  age: number
  kingdomResults: AgeKingdomResult[]
  bandGloryPerPlayer: Record<string, number>  // playerId → glory earned from bands + tribe powers this age
}

// state = scoredState (before beginAge) for age transitions; nextState = state after beginAge
type ActionResult =
  | { state: FullGameState; error?: never; ageTransition?: never }
  | { state: FullGameState; error: string; ageTransition?: never }
  | { state: FullGameState; nextState: FullGameState; ageTransition: AgeScoring; error?: never }

// ─── Utilities ────────────────────────────────────────────────────────────────

function nextActivePlayer(state: FullGameState): string {
  const idx = state.players.findIndex(p => p.id === state.activePlayerId)
  return state.players[(idx + 1) % state.players.length].id
}

function triangularBandGlory(cardCount: number): number {
  return (cardCount * (cardCount + 1)) / 2
}

/**
 * Validates a band with Halflings-aware logic.
 * Halflings are wildcards: valid if all non-Halfling cards share the same tribe or same color.
 */
function bandIsValid(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const hasHalflings = cards.some(c => c.tribe === 'HALFLINGS')
  const check = hasHalflings ? cards.filter(c => c.tribe !== 'HALFLINGS') : cards
  if (check.length === 0) return true  // all Halflings
  const tribes = new Set(check.map(c => c.tribe).filter(Boolean))
  const colors = new Set(check.map(c => c.color).filter(Boolean))
  return (tribes.size === 1 && check.every(c => c.tribe)) ||
         (colors.size === 1 && check.every(c => c.color))
}

// ─── Age scoring + transition ─────────────────────────────────────────────────

function endAge(state: FullGameState): ActionResult {
  const ageKey = `age${state.age}` as 'age1' | 'age2' | 'age3'
  let players = state.players.map(p => ({ ...p }))

  const kingdomResults: AgeKingdomResult[] = []

  for (const kingdom of state.kingdoms) {
    const rewards = kingdom.tokens[ageKey] as number[]

    const ranked = [...players].sort(
      (a, b) => (kingdom.markers[b.id] ?? 0) - (kingdom.markers[a.id] ?? 0)
    )

    const placements: AgeKingdomPlacement[] = []
    let posIdx = 0
    while (posIdx < rewards.length) {
      const markerCount = kingdom.markers[ranked[posIdx]?.id] ?? 0
      if (markerCount === 0) break

      const tied = ranked.filter(
        (_, i) => i >= posIdx && (kingdom.markers[ranked[i].id] ?? 0) === markerCount
      )
      const reward = rewards[posIdx]
      for (const p of tied) {
        placements.push({ playerId: p.id, markers: markerCount, reward })
        const idx = players.findIndex(x => x.id === p.id)
        players[idx] = {
          ...players[idx],
          glory: players[idx].glory + reward,
          gloryFromKingdoms: players[idx].gloryFromKingdoms + reward,
        }
      }
      posIdx += tied.length
    }

    if (placements.length > 0) {
      kingdomResults.push({ kingdomColor: kingdom.color, placements })
    }
  }

  const bandGloryPerPlayer: Record<string, number> = {}

  // Band glory (triangular formula)
  players = players.map(p => {
    let bandGlory = 0
    for (const band of p.bands) {
      bandGlory += triangularBandGlory(band.cards.length)
    }
    bandGloryPerPlayer[p.id] = bandGlory
    if (bandGlory === 0) return p
    return { ...p, glory: p.glory + bandGlory, gloryFromBands: p.gloryFromBands + bandGlory }
  })

  // Merfolk track glory (position = glory earned this era, track persists)
  players = players.map(p => {
    if (p.merfolkPosition === 0) return p
    const g = p.merfolkPosition
    bandGloryPerPlayer[p.id] = (bandGloryPerPlayer[p.id] ?? 0) + g
    return { ...p, glory: p.glory + g, gloryFromBands: p.gloryFromBands + g }
  })

  // Orc Horde glory (count of captured Orc cards), then reset horde
  players = players.map(p => {
    if (p.orcHorde === 0) return p
    const g = p.orcHorde
    bandGloryPerPlayer[p.id] = (bandGloryPerPlayer[p.id] ?? 0) + g
    return { ...p, glory: p.glory + g, gloryFromBands: p.gloryFromBands + g, orcHorde: 0 }
  })

  const nextAge = state.age + 1
  if (nextAge > state.totalAges) {
    // Game-end bonuses

    // Giant token: holder gets +2 glory
    if (state.giantToken?.heldByPlayerId) {
      const holderId = state.giantToken.heldByPlayerId
      players = players.map(p => {
        if (p.id !== holderId) return p
        return { ...p, glory: p.glory + 2, gloryFromBands: p.gloryFromBands + 2 }
      })
    }

    // Troll tokens: 1 glory per token
    players = players.map(p => {
      if (p.trollTokens === 0) return p
      return { ...p, glory: p.glory + p.trollTokens, gloryFromBands: p.gloryFromBands + p.trollTokens }
    })

    return { state: { ...state, players, status: 'FINISHED', activePlayerId: null } }
  }

  const scoredState: FullGameState = { ...state, players }

  const kingdoms = state.kingdoms.map(k => ({
    ...k,
    markers: Object.fromEntries(players.map(p => [p.id, 0])),
  }))
  const nextState = beginAge({ ...state, players, kingdoms, age: nextAge, dragonsRevealed: 0 })

  return {
    state: scoredState,
    nextState,
    ageTransition: { age: state.age, kingdomResults, bandGloryPerPlayer },
  }
}

// ─── Individual actions ───────────────────────────────────────────────────────

function recruitFromDeck(state: FullGameState, playerId: string): ActionResult {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { state, error: 'Player not found' }
  if (state.deck.length === 0) return { state, error: 'Deck is empty' }

  const [card, ...deck] = state.deck
  let next: FullGameState = { ...state, deck }

  if (card.type === 'DRAGON') {
    next = { ...next, market: [...next.market, card], dragonsRevealed: next.dragonsRevealed + 1 }
    if (next.dragonsRevealed >= 3) return endAge(next)
    return { state: { ...next, activePlayerId: nextActivePlayer(next) } }
  }

  if (player.hand.length >= 10) return { state, error: 'Hand is full (max 10 cards)' }

  const players = next.players.map(p =>
    p.id === playerId ? { ...p, hand: [...p.hand, card] } : p
  )
  return { state: { ...next, players, activePlayerId: nextActivePlayer(next) } }
}

function recruitFromMarket(state: FullGameState, playerId: string, cardId: number): ActionResult {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return { state, error: 'Player not found' }
  const card = state.market.find(c => c.id === cardId)
  if (!card) return { state, error: 'Card not in market' }

  if (player.hand.length >= 10) return { state, error: 'Hand is full (max 10 cards)' }

  const market = state.market.filter(c => c.id !== cardId)
  const players = state.players.map(p =>
    p.id === playerId ? { ...p, hand: [...p.hand, card] } : p
  )
  return { state: { ...state, market, players, activePlayerId: nextActivePlayer(state) } }
}

function playBand(
  state: FullGameState,
  playerId: string,
  cardIds: number[],
  leaderId: number,
  kingdomColorInput?: string,
  powerKingdomColor?: string,
  _trollKingdomColor?: string,
): ActionResult {
  if (cardIds.length === 0) return { state, error: 'Band must have at least 1 card' }

  const player = state.players.find(p => p.id === playerId)!
  const bandCards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as Card[]
  if (bandCards.length !== cardIds.length) return { state, error: 'Some cards not in hand' }

  const leader = bandCards.find(c => c.id === leaderId)
  if (!leader) return { state, error: 'Leader must be in the band' }

  if (!bandIsValid(bandCards)) {
    return { state, error: 'Band must be all same tribe or all same color (Halflings act as wildcards)' }
  }

  // Determine target kingdom
  const leaderTribe = leader.tribe
  const hasHalflings = bandCards.some(c => c.tribe === 'HALFLINGS')
  const nonHalflings = hasHalflings ? bandCards.filter(c => c.tribe !== 'HALFLINGS') : bandCards
  const checkCards = nonHalflings.length > 0 ? nonHalflings : bandCards

  const colorSet = new Set(checkCards.map(c => c.color).filter(Boolean))
  const allSameColor = colorSet.size === 1 && checkCards.every(c => c.color)

  const isMonotribeWingfolk = leaderTribe === 'WINGFOLK' && bandCards.every(c => c.tribe === 'WINGFOLK')

  let targetKingdomColor: KingdomColor | null = null
  if ((leaderTribe === 'MINOTAURS' || isMonotribeWingfolk) && powerKingdomColor) {
    // Free kingdom choice granted by Minotaurs / monotribe Wingfolk power
    targetKingdomColor = powerKingdomColor as KingdomColor
  } else if (allSameColor) {
    targetKingdomColor = [...colorSet][0] as KingdomColor
  } else {
    targetKingdomColor = (kingdomColorInput as KingdomColor) ?? leader.color
  }

  // Skeletons double the marker count
  const markerCount = leaderTribe === 'SKELETONS' ? bandCards.length * 2 : bandCards.length

  const kingdoms = state.kingdoms.map(k => {
    if (!targetKingdomColor || k.color !== targetKingdomColor) return k
    return { ...k, markers: { ...k.markers, [playerId]: (k.markers[playerId] ?? 0) + markerCount } }
  })

  const band: Band = {
    id: `${playerId}-${Date.now()}`,
    cards: bandCards,
    leaderId,
    kingdomColor: targetKingdomColor,
  }

  // Discard remaining hand — Orc power intercepts Orc cards for active Orc player
  const playedIds = new Set(cardIds)
  const discarded = player.hand.filter(c => !playedIds.has(c.id))

  let market = state.market
  let playerUpdates: Record<string, Partial<typeof player>> = {}

  const orcPlayerId = state.orcPowerPlayerId
  if (orcPlayerId && orcPlayerId !== playerId) {
    const orcDiscards = discarded.filter(c => c.tribe === 'ORCS')
    const regularDiscards = discarded.filter(c => c.tribe !== 'ORCS')
    market = [...state.market, ...regularDiscards]
    if (orcDiscards.length > 0) {
      playerUpdates[orcPlayerId] = { orcHorde: (state.players.find(p => p.id === orcPlayerId)?.orcHorde ?? 0) + orcDiscards.length }
    }
  } else {
    market = [...state.market, ...discarded]
  }

  const players = state.players.map(p => {
    const extra = playerUpdates[p.id] ?? {}
    if (p.id !== playerId) return { ...p, ...extra }
    return { ...p, hand: [], bands: [...p.bands, band], ...extra }
  })

  let nextState: FullGameState = {
    ...state,
    players,
    kingdoms,
    market,
    activePlayerId: nextActivePlayer(state),
  }

  nextState = applyLeaderPower(nextState, { playerId, leaderTribe, bandCards })

  return { state: nextState }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function applyAction(state: FullGameState, userId: string, action: GameAction): ActionResult {
  const player = state.players.find(p => p.userId === userId)
  if (!player) return { state, error: 'Not in this game' }
  if (state.status !== 'IN_PROGRESS') return { state, error: 'Game not in progress' }
  if (state.activePlayerId !== player.id) return { state, error: 'Not your turn' }

  switch (action.type) {
    case 'RECRUIT_FROM_DECK':    return recruitFromDeck(state, player.id)
    case 'RECRUIT_FROM_MARKET':  return recruitFromMarket(state, player.id, action.cardId)
    case 'PLAY_BAND':            return playBand(state, player.id, action.cardIds, action.leaderId, action.kingdomColor, action.powerKingdomColor, action.trollKingdomColor)
  }
}
