// Each kingdom is identified by its color on the board
export enum KingdomColor {
  ORANGE = 'ORANGE', // Ithys
  BLUE = 'BLUE',     // Straton
  RED = 'RED',       // Rhea
  PURPLE = 'PURPLE', // Duris
  GREEN = 'GREEN',   // Althea
  GRAY = 'GRAY',     // Pelagon
}

export enum KingdomName {
  ITHYS = 'ITHYS',
  STRATON = 'STRATON',
  RHEA = 'RHEA',
  DURIS = 'DURIS',
  ALTHEA = 'ALTHEA',
  PELAGON = 'PELAGON',
}

export interface IGloryToken {
  age1: number
  age2: number
  age3: number
}

export interface IKingdom {
  name: KingdomName
  color: KingdomColor
  gloryTokens: IGloryToken
  // control markers per player: playerId -> count
  controlMarkers: Record<string, number>
}
