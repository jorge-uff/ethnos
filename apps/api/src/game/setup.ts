import { Card, TribeName, KingdomColor, KingdomName, Kingdom, FullGameState, PlayerState, ClientGameState, ClientPlayerState } from './types.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TRIBES: TribeName[] = [
  'CENTAURS', 'DWARVES', 'ELVES', 'GIANTS', 'HALFLINGS',
  'MERFOLK', 'MINOTAURS', 'ORCS', 'SKELETONS', 'TROLLS',
  'WINGFOLK', 'WIZARDS',
]

const COLORS: KingdomColor[] = ['ORANGE', 'BLUE', 'RED', 'PURPLE', 'GREEN', 'GRAY']

const KINGDOMS: { name: KingdomName; color: KingdomColor }[] = [
  { name: 'ITHYS',   color: 'ORANGE' },
  { name: 'STRATON', color: 'BLUE'   },
  { name: 'RHEA',    color: 'RED'    },
  { name: 'DURIS',   color: 'PURPLE' },
  { name: 'ALTHEA',  color: 'GREEN'  },
  { name: 'PELAGON', color: 'GRAY'   },
]

// 18 glory tokens shuffled across 6 kingdoms (3 each), sorted ascending per kingdom
// Values from the official game: 0,0,2,2,4,4,4,4,6,6,6,6,6,8,8,8,10,10
const GLORY_TOKEN_POOL = [0, 0, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10]

// ─── Utilities ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Tribe selection ──────────────────────────────────────────────────────────

export function selectTribes(playerCount: number): TribeName[] {
  const count = playerCount <= 3 ? 5 : 6
  return shuffle(ALL_TRIBES).slice(0, count)
}

// ─── Deck building ────────────────────────────────────────────────────────────

export function buildDeck(tribes: TribeName[]): Card[] {
  let idCounter = 1
  const allies: Card[] = []

  for (const tribe of tribes) {
    // Halflings have 24 cards (4 per color), all others have 12 (2 per color)
    const copiesPerColor = tribe === 'HALFLINGS' ? 4 : 2
    for (const color of COLORS) {
      for (let i = 0; i < copiesPerColor; i++) {
        allies.push({ id: idCounter++, type: 'ALLY', tribe, color })
      }
    }
  }

  // Dragon cards (type ALLY here, tribe and color null)
  const dragons: Card[] = [
    { id: idCounter++, type: 'DRAGON', tribe: null, color: null },
    { id: idCounter++, type: 'DRAGON', tribe: null, color: null },
    { id: idCounter++, type: 'DRAGON', tribe: null, color: null },
  ]

  return shuffleWithDragons(shuffle(allies), dragons)
}

// Dragons go into the bottom half of the deck
function shuffleWithDragons(allies: Card[], dragons: Card[]): Card[] {
  const mid = Math.floor(allies.length / 2)
  const top    = allies.slice(0, mid)
  const bottom = shuffle([...allies.slice(mid), ...dragons])
  return [...top, ...bottom]
}

// ─── Kingdom setup ────────────────────────────────────────────────────────────

export function setupKingdoms(players: PlayerState[]): Kingdom[] {
  const shuffledTokens = shuffle([...GLORY_TOKEN_POOL])
  const playerIds = players.map(p => p.id)

  return KINGDOMS.map((k, i) => {
    // Sort descending: highest token = 1st place, middle = 2nd, lowest = 3rd
    const [t1, t2, t3] = shuffledTokens.slice(i * 3, i * 3 + 3).sort((a, b) => b - a)
    const markers: Record<string, number> = {}
    for (const id of playerIds) markers[id] = 0

    return {
      name: k.name,
      color: k.color,
      tokens: { age1: [t1], age2: [t1, t2], age3: [t1, t2, t3] },
      markers,
    }
  })
}

// ─── Begin an age ─────────────────────────────────────────────────────────────

export function beginAge(state: FullGameState): FullGameState {
  let deck = [...state.deck]
  const players = state.players.map(p => ({ ...p, hand: [...p.hand], bands: [] }))
  const marketSize = state.players.length * 2

  // Each player draws 1 card
  for (const player of players) {
    const card = deck.shift()!
    player.hand.push(card)
  }

  // Set up market
  const market = deck.splice(0, marketSize)

  // Shuffle dragons into the bottom half for this age
  const dragons: Card[] = [
    { id: 9001, type: 'DRAGON', tribe: null, color: null },
    { id: 9002, type: 'DRAGON', tribe: null, color: null },
    { id: 9003, type: 'DRAGON', tribe: null, color: null },
  ]
  const mid = Math.floor(deck.length / 2)
  const top    = deck.slice(0, mid)
  const bottom = shuffle([...deck.slice(mid), ...dragons])
  deck = [...top, ...bottom]

  // First player: age 1 = random, age 2+ = player with least glory
  let activePlayerId = state.activePlayerId
  if (state.age === 1) {
    activePlayerId = players[Math.floor(Math.random() * players.length)].id
  } else {
    const sorted = [...players].sort((a, b) => a.glory - b.glory)
    activePlayerId = sorted[0].id
  }

  return { ...state, deck, market, players, activePlayerId, dragonsRevealed: 0 }
}

// ─── Full game init ───────────────────────────────────────────────────────────

export function initGame(partial: Pick<FullGameState, 'id' | 'totalAges' | 'players'>): FullGameState {
  const tribes  = selectTribes(partial.players.length)
  const deck    = buildDeck(tribes)
  const kingdoms = setupKingdoms(partial.players)

  const base: FullGameState = {
    ...partial,
    status: 'IN_PROGRESS',
    age: 1,
    activeTribes: tribes,
    deck,
    market: [],
    kingdoms,
    activePlayerId: null,
    dragonsRevealed: 0,
  }

  return beginAge(base)
}

// ─── Tiebreaker helpers ───────────────────────────────────────────────────────

export function totalMarkers(player: PlayerState, kingdoms: Kingdom[]): number {
  return kingdoms.reduce((sum, k) => sum + (k.markers[player.id] ?? 0), 0)
}

export function lastAgeBandSizes(player: PlayerState): number[] {
  return player.bands.map(b => b.cards.length).sort((a, b) => b - a)
}

// ─── Client-safe view ─────────────────────────────────────────────────────────

export function toClientState(state: FullGameState): ClientGameState {
  const { deck, players, ...rest } = state
  const clientPlayers: ClientPlayerState[] = players.map(p => ({
    ...p,
    totalMarkers: totalMarkers(p, state.kingdoms),
    lastAgeBandSizes: lastAgeBandSizes(p),
  }))
  return { ...rest, players: clientPlayers, deckSize: deck.length }
}
