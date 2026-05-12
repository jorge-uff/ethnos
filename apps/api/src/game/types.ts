// Internal server-side types (superset of @ethnos/types — includes full deck)

export type TribeName =
  | 'CENTAURS' | 'DWARVES' | 'ELVES' | 'GIANTS' | 'HALFLINGS'
  | 'MERFOLK'  | 'MINOTAURS' | 'ORCS' | 'SKELETONS' | 'TROLLS'
  | 'WINGFOLK' | 'WIZARDS'

export type KingdomColor = 'ORANGE' | 'BLUE' | 'RED' | 'PURPLE' | 'GREEN' | 'GRAY'
export type KingdomName  = 'ITHYS'  | 'STRATON' | 'RHEA' | 'DURIS' | 'ALTHEA' | 'PELAGON'

export interface Card {
  id: number
  type: 'ALLY' | 'DRAGON'
  tribe: TribeName | null
  color: KingdomColor | null
}

export interface GloryTokens {
  age1: [number]
  age2: [number, number]
  age3: [number, number, number]
}

export interface Kingdom {
  name: KingdomName
  color: KingdomColor
  tokens: GloryTokens
  // playerId -> number of markers
  markers: Record<string, number>
}

export interface Band {
  id: string
  cards: Card[]
  leaderId: number
  kingdomColor: KingdomColor | null
}

export interface PlayerState {
  id: string
  userId: string
  username: string
  color: string
  glory: number
  gloryFromKingdoms: number
  gloryFromBands: number
  hand: Card[]
  bands: Band[]
  // Tribe power state (persisted in DB)
  merfolkPosition: number   // 0-6, Merfolk track
  orcHorde: number          // count of captured Orc cards
  trollTokens: number       // total troll tokens placed (scored at game end)
}

export interface GiantTokenState {
  heldByPlayerId: string
  bandSize: number
}

export interface FullGameState {
  id: string
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED'
  age: number
  totalAges: number
  activeTribes: TribeName[]
  deck: Card[]          // hidden from clients
  market: Card[]
  kingdoms: Kingdom[]
  players: PlayerState[]
  activePlayerId: string | null
  dragonsRevealed: number
  // Tribe power state (game-level)
  giantToken: GiantTokenState | null  // null if Giants not in play or unclaimed
  orcPowerPlayerId: string | null     // player whose Orc power intercepts discards
}

// Per-player view sent to clients. Adds derived fields used for tiebreakers
// in the final ranking (more total markers → larger last-age band → next, etc.)
export interface ClientPlayerState extends PlayerState {
  totalMarkers: number
  lastAgeBandSizes: number[]   // sorted descending
}

// What gets sent to clients (no deck contents)
export type ClientGameState = Omit<FullGameState, 'deck' | 'players'> & {
  deckSize: number
  players: ClientPlayerState[]
}
