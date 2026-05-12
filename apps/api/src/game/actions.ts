import { FullGameState, Card, KingdomColor, Band } from './types.js'
import { beginAge } from './setup.js'
<<<<<<< HEAD
import { applyLeaderPower, routeOrcDiscard } from './tribePowers.js'
=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715

// ─── Action types ─────────────────────────────────────────────────────────────

export type GameAction =
  | { type: 'RECRUIT_FROM_DECK' }
  | { type: 'RECRUIT_FROM_MARKET'; cardId: number }
<<<<<<< HEAD
  | { type: 'PLAY_BAND'; cardIds: number[]; leaderId: number; kingdomColor?: string; wingfolkKingdomColor?: string }
=======
  | { type: 'PLAY_BAND'; cardIds: number[]; leaderId: number; kingdomColor?: string }
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715

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
  bandGloryPerPlayer: Record<string, number>  // playerId → glory earned from bands this age
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

// ─── Age scoring + transition ─────────────────────────────────────────────────

function endAge(state: FullGameState): ActionResult {
  const ageKey = `age${state.age}` as 'age1' | 'age2' | 'age3'
  let players = state.players.map(p => ({ ...p }))

  const kingdomResults: AgeKingdomResult[] = []

  for (const kingdom of state.kingdoms) {
    const rewards = kingdom.tokens[ageKey] as number[]

    // Sort players by marker count descending
    const ranked = [...players].sort(
      (a, b) => (kingdom.markers[b.id] ?? 0) - (kingdom.markers[a.id] ?? 0)
    )

    const placements: AgeKingdomPlacement[] = []
    let posIdx = 0
    while (posIdx < rewards.length) {
      const markerCount = kingdom.markers[ranked[posIdx]?.id] ?? 0
      if (markerCount === 0) break

      // All players tied at this position share the same reward without splitting
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
  players = players.map(p => {
    let bandGlory = 0
    for (const band of p.bands) {
      bandGlory += triangularBandGlory(band.cards.length)
    }
    bandGloryPerPlayer[p.id] = bandGlory
    if (bandGlory === 0) return p
    return {
      ...p,
      glory: p.glory + bandGlory,
      gloryFromBands: p.gloryFromBands + bandGlory,
    }
  })

  const nextAge = state.age + 1
  if (nextAge > state.totalAges) {
    // Keep markers and bands intact so the FinishedScreen can apply the
    // official tiebreaker cascade (glory → total markers → largest band → next).
    return { state: { ...state, players, status: 'FINISHED', activePlayerId: null } }
  }

  // scoredState: scoring applied but age not yet incremented (sent to REST caller)
  const scoredState: FullGameState = { ...state, players }

  // Reset markers and begin the next age
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

<<<<<<< HEAD
function isValidBand(cards: Card[]): boolean {
  if (cards.length === 0) return false
  const nonHalflings = cards.filter(c => c.tribe !== 'HALFLINGS')
  if (nonHalflings.length === 0) return true

  const tribeSet = new Set(nonHalflings.map(c => c.tribe).filter(Boolean))
  const colorSet = new Set(nonHalflings.map(c => c.color).filter(Boolean))
  const allSameTribe = tribeSet.size === 1 && nonHalflings.every(c => c.tribe)
  const allSameColor = colorSet.size === 1 && nonHalflings.every(c => c.color)
  return allSameTribe || allSameColor
}

=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
function playBand(
  state: FullGameState,
  playerId: string,
  cardIds: number[],
  leaderId: number,
  kingdomColorInput?: string,
<<<<<<< HEAD
  wingfolkKingdomColor?: string,
=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
): ActionResult {
  if (cardIds.length === 0) return { state, error: 'Band must have at least 1 card' }

  const player = state.players.find(p => p.id === playerId)!
  const bandCards = cardIds.map(id => player.hand.find(c => c.id === id)).filter(Boolean) as Card[]
  if (bandCards.length !== cardIds.length) return { state, error: 'Some cards not in hand' }

  const leader = bandCards.find(c => c.id === leaderId)
  if (!leader) return { state, error: 'Leader must be in the band' }

<<<<<<< HEAD
  if (!isValidBand(bandCards)) {
    return { state, error: 'Band must be all same tribe or all same color' }
  }

  const nonHalflings = bandCards.filter(c => c.tribe !== 'HALFLINGS')
  const tribeSet = new Set(nonHalflings.map(c => c.tribe).filter(Boolean))
  const colorSet = new Set(nonHalflings.map(c => c.color).filter(Boolean))
  const allSameTribe = tribeSet.size === 1 && nonHalflings.length > 0
  const allSameColor = colorSet.size === 1 && nonHalflings.length > 0

  const leaderIsMinotaur = leader.tribe === 'MINOTAURS'
  const leaderIsWingfolk = leader.tribe === 'WINGFOLK'

  let targetKingdomColor: KingdomColor | null = null
  if (allSameColor && !leaderIsMinotaur && !leaderIsWingfolk) {
    targetKingdomColor = [...colorSet][0] as KingdomColor
  } else {
    targetKingdomColor = (kingdomColorInput as KingdomColor) ?? leader.color
  }

  const markerAmount = leader.tribe === 'SKELETONS' ? bandCards.length * 2 : bandCards.length
  const kingdoms = state.kingdoms.map(k => {
    if (!targetKingdomColor || k.color !== targetKingdomColor) return k
    return {
      ...k,
      markers: { ...k.markers, [playerId]: (k.markers[playerId] ?? 0) + markerAmount },
    }
=======
  // Validate: all same tribe OR all same color (ignoring null values)
  const tribeSet = new Set(bandCards.map(c => c.tribe).filter(Boolean))
  const colorSet = new Set(bandCards.map(c => c.color).filter(Boolean))
  const allSameTribe = tribeSet.size === 1 && bandCards.every(c => c.tribe)
  const allSameColor = colorSet.size === 1 && bandCards.every(c => c.color)

  if (!allSameTribe && !allSameColor) {
    return { state, error: 'Band must be all same tribe or all same color' }
  }

  // Determine kingdom
  let targetKingdomColor: KingdomColor | null = null
  if (allSameColor) {
    targetKingdomColor = [...colorSet][0] as KingdomColor
  } else {
    // Same tribe: kingdom is leader's color
    targetKingdomColor = (kingdomColorInput as KingdomColor) ?? leader.color
  }

  // Place markers
  const kingdoms = state.kingdoms.map(k => {
    if (!targetKingdomColor || k.color !== targetKingdomColor) return k
    return { ...k, markers: { ...k.markers, [playerId]: (k.markers[playerId] ?? 0) + bandCards.length } }
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
  })

  const band: Band = {
    id: `${playerId}-${Date.now()}`,
    cards: bandCards,
    leaderId,
    kingdomColor: targetKingdomColor,
  }

<<<<<<< HEAD
  const playedIds = new Set(cardIds)
  const discarded = player.hand.filter(c => !playedIds.has(c.id))
  const { market: routedMarket, players: playersWithOrcHorde } = routeOrcDiscard(state, discarded, playerId)

  const players = playersWithOrcHorde.map(p =>
    p.id !== playerId ? p : { ...p, hand: [], bands: [...p.bands, band] }
  )

  const nextState = {
    ...state,
    players,
    kingdoms,
    market: routedMarket,
    activePlayerId: nextActivePlayer(state),
  }

  return {
    state: applyLeaderPower(nextState, playerId, band, wingfolkKingdomColor),
  }
=======
  // Remaining hand → market
  const playedIds = new Set(cardIds)
  const discarded = player.hand.filter(c => !playedIds.has(c.id))
  const market = [...state.market, ...discarded]

  const players = state.players.map(p =>
    p.id !== playerId ? p : { ...p, hand: [], bands: [...p.bands, band] }
  )

  return { state: { ...state, players, kingdoms, market, activePlayerId: nextActivePlayer(state) } }
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
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
    case 'PLAY_BAND':            return playBand(state, player.id, action.cardIds, action.leaderId, action.kingdomColor)
  }
}
