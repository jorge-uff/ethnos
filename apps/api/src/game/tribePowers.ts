import { FullGameState, Band, KingdomColor, Card } from './types.js'

const KINGDOM_ORDER: KingdomColor[] = ['ORANGE', 'BLUE', 'RED', 'PURPLE', 'GREEN', 'GRAY']

function drawTopCard(state: FullGameState, playerId: string): FullGameState {
  if (state.deck.length === 0) return state

  const [card, ...deck] = state.deck
  let nextState: FullGameState = { ...state, deck }

  if (card.type === 'DRAGON') {
    nextState = {
      ...nextState,
      market: [...nextState.market, card],
      dragonsRevealed: nextState.dragonsRevealed + 1,
    }
    return nextState
  }

  nextState = {
    ...nextState,
    players: nextState.players.map(p =>
      p.id === playerId
        ? { ...p, hand: [...p.hand, card] }
        : p
    ),
  }

  return nextState
}

function recruitFreeMarket(state: FullGameState, playerId: string): FullGameState {
  if (state.market.length === 0) return state

  const card = state.market[0]
  const market = state.market.slice(1)

  return {
    ...state,
    market,
    players: state.players.map(p =>
      p.id === playerId
        ? { ...p, hand: [...p.hand, card] }
        : p
    ),
  }
}

function getOrcHordeOwner(state: FullGameState, excludingPlayerId: string): string | null {
  const owner = state.players.find(p =>
    p.id !== excludingPlayerId && p.bands.some(b => b.cards.find(c => c.id === b.leaderId)?.tribe === 'ORCS')
  )
  return owner?.id ?? null
}

export function applyLeaderPower(
  state: FullGameState,
  playerId: string,
  band: Band,
  specialKingdomColor?: KingdomColor | null,
): FullGameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const leader = band.cards.find(c => c.id === band.leaderId)
  if (!leader || !leader.tribe) return state

  let nextState = state
  const leaderTribe = leader.tribe

  switch (leaderTribe) {
    case 'DWARVES':
      nextState = drawTopCard(nextState, playerId)
      break

    case 'ELVES':
      nextState = recruitFreeMarket(nextState, playerId)
      break

    case 'WIZARDS':
      nextState = drawTopCard(nextState, playerId)
      break

    case 'GIANTS':
      nextState = {
        ...nextState,
        giantToken: {
          heldByPlayerId: playerId,
          bandSize: band.cards.length,
        },
      }
      break

    case 'MERFOLK':
      nextState = {
        ...nextState,
        players: nextState.players.map(p =>
          p.id === playerId
            ? { ...p, merfolkPosition: Math.min(6, p.merfolkPosition + 1) }
            : p
        ),
      }
      break

    case 'TROLLS': {
      const trollCount = band.cards.filter(c => c.tribe === 'TROLLS').length
      const kingdom = specialKingdomColor ?? band.kingdomColor
      if (trollCount > 0 && kingdom) {
        const kingdomIndex = KINGDOM_ORDER.indexOf(kingdom)
        nextState = {
          ...nextState,
          players: nextState.players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  trollTokens: [...p.trollTokens, ...Array(trollCount).fill(kingdomIndex)],
                }
              : p
          ),
        }
      }
      break
    }

    case 'ORCS': {
      // Orc leader does not grant an immediate band effect.
      // Orc Horde routing is handled when opponents discard Orc cards.
      break
    }

    case 'SKELETONS':
    case 'HALFLINGS':
    case 'CENTAURS':
    case 'MINOTAURS':
    case 'WINGFOLK':
      break
  }

  return nextState
}

export function routeOrcDiscard(
  state: FullGameState,
  discards: Card[],
  excludingPlayerId: string,
): { market: Card[]; players: FullGameState['players'] } {
  const ownerId = getOrcHordeOwner(state, excludingPlayerId)
  let market: Card[] = []
  let players = state.players.map(p => ({ ...p }))

  for (const card of discards) {
    if (card.tribe === 'ORCS' && ownerId && card.color) {
      players = players.map(p =>
        p.id === ownerId
          ? {
              ...p,
              orcHorde: {
                ...p.orcHorde,
                [card.color]: (p.orcHorde[card.color] ?? 0) + 1,
              },
            }
          : p
      )
      continue
    }
    market.push(card)
  }

  return { market, players }
}
