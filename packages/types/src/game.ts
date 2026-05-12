import { ICard } from './card'
import { IKingdom } from './kingdom'
import { IPlayer } from './player'
import { TribeName } from './tribe'

export enum GameStatus {
  WAITING = 'WAITING',     // lobby, waiting for players
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export enum Age {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

export interface IGiantToken {
  heldByPlayerId: string | null
  bandSize: number // size of the band currently holding the token
}

export interface IGameState {
  id: string
  status: GameStatus
  age: Age
  activePlayerId: string
  players: IPlayer[]
  kingdoms: IKingdom[]
  // 6 tribes active this game (randomly selected at setup)
  activeTribes: TribeName[]
  // face-up ally cards in the market
  market: ICard[]
  // number of cards remaining in the deck (clients don't see the deck)
  deckSize: number
  // dragon cards revealed this age (0, 1, or 2 — on 3 the age ends)
  dragonsRevealed: number
  // special tokens state
  giantToken: IGiantToken | null    // null if Giants not in play
  merfolkInPlay: boolean
  trollsInPlay: boolean
  orcsInPlay: boolean
  // 2-3 player game uses only 2 ages
  totalAges: Age.TWO | Age.THREE
}
