import { ICard } from './card'
import { IBand } from './band'
import { KingdomColor } from './kingdom'

export interface IPlayer {
  id: string
  userId: string
  username: string
  color: PlayerColor
  glory: number
  hand: ICard[]
  bands: IBand[]          // bands played this age (face up in front of player)
  // Orc Horde board: color -> markers placed
  orcHorde: Partial<Record<KingdomColor, number>>
  // Merfolk track position (if Merfolk in play)
  merfolkPosition: number
  // Troll tokens held
  trollTokens: number[]
}

export enum PlayerColor {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
  BLUE = 'BLUE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  PURPLE = 'PURPLE',
}
