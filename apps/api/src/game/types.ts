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
  age1: number
  age2: number
  age3: number
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
}

// What gets sent to clients (no deck contents)
export type ClientGameState = Omit<FullGameState, 'deck'> & { deckSize: number }
