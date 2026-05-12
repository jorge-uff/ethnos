import { IGameState } from './game'
import { PlayerAction } from './actions'

// ─── Age-transition payload ───────────────────────────────────────────────────

export interface IAgeKingdomPlacement {
  playerId: string
  username: string
  markers: number
  reward: number
}

export interface IAgeKingdomResult {
  kingdomColor: string
  placements: IAgeKingdomPlacement[]  // only players with markers > 0, sorted by position
}

export interface IAgePlayerScore {
  playerId: string
  username: string
  gloryFromKingdoms: number  // earned this age
  gloryFromBands: number     // earned this age
  totalGlory: number         // accumulated total after this age
}

export interface IAgeEndedPayload {
  age: number
  kingdomResults: IAgeKingdomResult[]
  playerScores: IAgePlayerScore[]
}

// ─── Events emitted by the SERVER ─────────────────────────────────────────────
export interface ServerToClientEvents {
  'game:state'         : (state: IGameState) => void
  'game:error'         : (message: string) => void
  'game:player-joined' : (playerId: string, username: string) => void
  'game:player-left'   : (playerId: string) => void
  'game:started'       : (state: IGameState) => void
  'game:age-ended'     : (payload: IAgeEndedPayload) => void
  'game:finished'      : (state: IGameState) => void
  'chat:message'       : (playerId: string, username: string, message: string) => void
}

// Events emitted by the CLIENT
export interface ClientToServerEvents {
  'game:join'   : (gameId: string) => void
  'game:leave'  : (gameId: string) => void
  'game:action' : (gameId: string, action: PlayerAction) => void
  'chat:send'   : (gameId: string, message: string) => void
}
