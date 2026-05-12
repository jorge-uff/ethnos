import { KingdomColor } from './kingdom'

// All actions a player can take on their turn
export enum ActionType {
  RECRUIT_FROM_MARKET = 'RECRUIT_FROM_MARKET', // pick a face-up card
  RECRUIT_FROM_DECK = 'RECRUIT_FROM_DECK',     // draw from the top of the deck
  PLAY_BAND = 'PLAY_BAND',                     // play a group of cards as a band
}

export interface IRecruitFromMarketAction {
  type: ActionType.RECRUIT_FROM_MARKET
  cardId: number
}

export interface IRecruitFromDeckAction {
  type: ActionType.RECRUIT_FROM_DECK
}

export interface IPlayBandAction {
  type: ActionType.PLAY_BAND
  cardIds: number[]       // all cards in the band
  leaderId: number        // which card is the leader
  // where to place the control marker (null = don't place one)
  kingdomColor: KingdomColor | null
  // Wingfolk: can override kingdom color or Minotaur free placement
  wingfolkKingdomColor?: KingdomColor
}

export type PlayerAction =
  | IRecruitFromMarketAction
  | IRecruitFromDeckAction
  | IPlayBandAction
