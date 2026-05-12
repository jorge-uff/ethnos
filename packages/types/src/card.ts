import { TribeName } from './tribe'
import { KingdomColor } from './kingdom'

export enum CardType {
  ALLY = 'ALLY',
  DRAGON = 'DRAGON',
}

export interface ICard {
  id: number
  type: CardType
  tribe: TribeName | null   // null for Dragon cards
  color: KingdomColor | null // null for Dragon cards
}
