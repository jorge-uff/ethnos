import type { FullGameState, Card, KingdomColor, TribeName } from './types.js'

export interface PowerInput {
  playerId: string
  leaderTribe: TribeName | null
  bandCards: Card[]
  trollKingdomColor?: KingdomColor
}

/**
 * Applies the leader tribe's post-band power to the game state.
 * Called after markers are placed and hand is discarded in playBand().
 *
 * Powers that affect marker placement (Skeletons, Minotaurs, Wingfolk) or
 * band validation (Halflings) are handled directly in playBand() instead.
 */
export function applyLeaderPower(state: FullGameState, input: PowerInput): FullGameState {
  const { playerId, leaderTribe, bandCards } = input

  switch (leaderTribe) {
    case 'CENTAURS':
    case 'HALFLINGS':
    case 'SKELETONS':
    case 'MINOTAURS':
    case 'WINGFOLK':
      return state

    // Dwarves and Wizards both draw 1 card from the top of the deck
    case 'DWARVES':
    case 'WIZARDS': {
      if (state.deck.length === 0) return state
      const [card, ...deck] = state.deck
      // Skip dragons (power fizzles) — dragon stays in deck for future draws
      if (card.type === 'DRAGON') return state
      const players = state.players.map(p =>
        p.id !== playerId ? p : { ...p, hand: [...p.hand, card] }
      )
      return { ...state, deck, players }
    }

    // Elves recruit 1 free card from the market (first non-dragon card)
    case 'ELVES': {
      const cardIdx = state.market.findIndex(c => c.type !== 'DRAGON')
      if (cardIdx === -1) return state
      const card = state.market[cardIdx]
      const market = state.market.filter(c => c.id !== card.id)
      const players = state.players.map(p =>
        p.id !== playerId ? p : { ...p, hand: [...p.hand, card] }
      )
      return { ...state, market, players }
    }

    // Giants: claim token if band is bigger than current holder's band
    case 'GIANTS': {
      const size = bandCards.length
      const current = state.giantToken
      if (!current || size > current.bandSize) {
        return { ...state, giantToken: { heldByPlayerId: playerId, bandSize: size } }
      }
      return state
    }

    // Merfolk: advance track position by 1 (max 6)
    case 'MERFOLK': {
      const players = state.players.map(p =>
        p.id !== playerId ? p : { ...p, merfolkPosition: Math.min(6, p.merfolkPosition + 1) }
      )
      return { ...state, players }
    }

    // Orcs: activate Orc power — future opponents' Orc discards go to this player's horde
    case 'ORCS':
      return { ...state, orcPowerPlayerId: playerId }

    // Trolls: add one token per Troll card in band
    case 'TROLLS': {
      const trollCount = bandCards.filter(c => c.tribe === 'TROLLS').length
      if (trollCount === 0) return state
      const players = state.players.map(p =>
        p.id !== playerId ? p : { ...p, trollTokens: p.trollTokens + trollCount }
      )
      return { ...state, players }
    }

    default:
      return state
  }
}
