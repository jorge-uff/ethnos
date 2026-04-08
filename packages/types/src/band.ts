import { ICard } from './card'
import { KingdomColor } from './kingdom'

export interface IBand {
  id: string
  cards: ICard[]
  leader: ICard
  // kingdom where the control marker was placed (null if no marker placed)
  kingdomColor: KingdomColor | null
  // size at scoring time (Dwarves add 1, Skeletons are removed before scoring)
  scoringSize?: number
}
