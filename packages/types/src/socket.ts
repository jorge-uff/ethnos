import { IGameState } from './game'
import { PlayerAction } from './actions'

// Events emitted by the SERVER
export interface ServerToClientEvents {
  'game:state'         : (state: IGameState) => void
  'game:error'         : (message: string) => void
  'game:player-joined' : (playerId: string, username: string) => void
  'game:player-left'   : (playerId: string) => void
  'game:started'       : (state: IGameState) => void
  'game:age-ended'     : (age: number, state: IGameState) => void
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
