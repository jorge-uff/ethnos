export enum TribeName {
  CENTAURS = 'CENTAURS',
  DWARVES = 'DWARVES',
  ELVES = 'ELVES',
  GIANTS = 'GIANTS',
  HALFLINGS = 'HALFLINGS',
  MERFOLK = 'MERFOLK',
  MINOTAURS = 'MINOTAURS',
  ORCS = 'ORCS',
  SKELETONS = 'SKELETONS',
  TROLLS = 'TROLLS',
  WINGFOLK = 'WINGFOLK',
  WIZARDS = 'WIZARDS',
}

export interface ITribe {
  name: TribeName
  description: string
}
