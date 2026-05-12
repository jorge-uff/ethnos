/**
 * Testes de regras de jogo — Ethnos
 *
 * Cobrem setup.ts e actions.ts contra as regras documentadas em docs/game-rules.md
 * e o escopo da demo em docs/scope.md.
 *
 * Divergências intencionais documentadas em scope.md NÃO são falhas de teste:
 *  - Dragão: turno encerra (oficial: jogador saca outra carta)
 *  - Marcadores: adiciona band.length ao total atual (oficial: só adiciona se atual < band.length)
 *  - Pontuação de bandos: n*(n+1)/2 (oficial: tabela 0,1,3,6,10,15)
 *  - Empate em reinos: ambos ganham o token inteiro (oficial: dividir e arredondar para baixo)
 *
 * Ticket #7 (poderes de tribo / Líder) está fora do escopo destes testes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectTribes,
  buildDeck,
  setupKingdoms,
  beginAge,
  totalMarkers,
  lastAgeBandSizes,
} from '../setup.js'
import { applyAction } from '../actions.js'
import type { FullGameState, PlayerState, Card, Kingdom, KingdomColor, KingdomName, TribeName } from '../types.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 1
function nextId() { return _id++ }
beforeEach(() => { _id = 1 })

function ally(tribe: TribeName, color: KingdomColor): Card {
  return { id: nextId(), type: 'ALLY', tribe, color }
}
function dragon(): Card {
  return { id: nextId(), type: 'DRAGON', tribe: null, color: null }
}

function makePlayer(id: string, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id,
    userId: `u-${id}`,
    username: `user-${id}`,
    color: 'WHITE',
    glory: 0,
    gloryFromKingdoms: 0,
    gloryFromBands: 0,
    hand: [],
    bands: [],
<<<<<<< HEAD
    orcHorde: {},
    merfolkPosition: 0,
    trollTokens: [],
=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
    ...overrides,
  }
}

const KINGDOM_DEFS: { name: KingdomName; color: KingdomColor }[] = [
  { name: 'ITHYS', color: 'ORANGE' },
  { name: 'STRATON', color: 'BLUE' },
  { name: 'RHEA', color: 'RED' },
  { name: 'DURIS', color: 'PURPLE' },
  { name: 'ALTHEA', color: 'GREEN' },
  { name: 'PELAGON', color: 'GRAY' },
]

function makeKingdom(
  color: KingdomColor,
  playerIds: string[],
  tokens = { age1: [8] as [number], age2: [8, 4] as [number, number], age3: [8, 4, 2] as [number, number, number] },
  markers: Record<string, number> = {}
): Kingdom {
  const name = KINGDOM_DEFS.find(k => k.color === color)!.name
  const fullMarkers: Record<string, number> = Object.fromEntries(playerIds.map(id => [id, 0]))
  return { name, color, tokens, markers: { ...fullMarkers, ...markers } }
}

function makeState(overrides: Partial<FullGameState> = {}): FullGameState {
  const players = overrides.players ?? [makePlayer('p1'), makePlayer('p2')]
  const ids = players.map(p => p.id)
  return {
    id: 'g1',
    status: 'IN_PROGRESS',
    age: 1,
    totalAges: 3,
    activeTribes: ['CENTAURS', 'ELVES'] as TribeName[],
    deck: [],
    market: [],
    kingdoms: KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)),
    players,
    activePlayerId: players[0].id,
    dragonsRevealed: 0,
    ...overrides,
  }
}

// ─── selectTribes ─────────────────────────────────────────────────────────────

const ALL_TRIBES: TribeName[] = [
  'CENTAURS', 'DWARVES', 'ELVES', 'GIANTS', 'HALFLINGS',
  'MERFOLK', 'MINOTAURS', 'ORCS', 'SKELETONS', 'TROLLS', 'WINGFOLK', 'WIZARDS',
]

describe('selectTribes', () => {
  it('seleciona 6 tribos para 4+ jogadores', () => {
    expect(selectTribes(4)).toHaveLength(6)
    expect(selectTribes(6)).toHaveLength(6)
  })

  it('seleciona 5 tribos para 2–3 jogadores', () => {
    expect(selectTribes(2)).toHaveLength(5)
    expect(selectTribes(3)).toHaveLength(5)
  })

  it('retorna apenas tribos válidas sem duplicatas', () => {
    for (let n = 2; n <= 6; n++) {
      const tribes = selectTribes(n)
      const unique = new Set(tribes)
      expect(unique.size).toBe(tribes.length)
      tribes.forEach(t => expect(ALL_TRIBES).toContain(t))
    }
  })
})

// ─── buildDeck ────────────────────────────────────────────────────────────────

describe('buildDeck', () => {
  it('gera exatamente 3 cartas Dragão', () => {
    const deck = buildDeck(['CENTAURS', 'ELVES'])
    expect(deck.filter(c => c.type === 'DRAGON')).toHaveLength(3)
  })

  it('gera 12 cartas por tribo comum (2 cópias por cor × 6 cores)', () => {
    const deck = buildDeck(['CENTAURS', 'ELVES'])
    const centaurs = deck.filter(c => c.tribe === 'CENTAURS')
    const elves = deck.filter(c => c.tribe === 'ELVES')
    expect(centaurs).toHaveLength(12)
    expect(elves).toHaveLength(12)
  })

  it('gera 24 cartas para Halflings (4 cópias por cor × 6 cores)', () => {
    const deck = buildDeck(['HALFLINGS'])
    expect(deck.filter(c => c.tribe === 'HALFLINGS')).toHaveLength(24)
  })

  it('não coloca nenhum Dragão na metade superior do deck', () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildDeck(['CENTAURS', 'ELVES'])
      const allies = deck.filter(c => c.type === 'ALLY')
      const topHalf = deck.slice(0, Math.floor(allies.length / 2))
      expect(topHalf.filter(c => c.type === 'DRAGON')).toHaveLength(0)
    }
  })

  it('todos os Dragões estão na metade inferior do deck', () => {
    for (let i = 0; i < 10; i++) {
      const deck = buildDeck(['CENTAURS', 'ELVES'])
      const allies = deck.filter(c => c.type === 'ALLY')
      const bottomHalf = deck.slice(Math.floor(allies.length / 2))
      expect(bottomHalf.filter(c => c.type === 'DRAGON')).toHaveLength(3)
    }
  })

  it('cada carta possui id único', () => {
    const deck = buildDeck(['CENTAURS', 'ELVES', 'DWARVES'])
    const ids = deck.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─── setupKingdoms ────────────────────────────────────────────────────────────

describe('setupKingdoms', () => {
  const players = [makePlayer('p1'), makePlayer('p2')]

  it('retorna exatamente 6 reinos', () => {
    expect(setupKingdoms(players)).toHaveLength(6)
  })

  it('cada reino tem tokens em ordem decrescente (maior = 1º lugar)', () => {
    const kingdoms = setupKingdoms(players)
    for (const k of kingdoms) {
      const [t1] = k.tokens.age1
      const [t2a, t2b] = k.tokens.age2
      const [t3a, t3b, t3c] = k.tokens.age3
      expect(t2a).toBeGreaterThanOrEqual(t2b)
      expect(t3a).toBeGreaterThanOrEqual(t3b)
      expect(t3b).toBeGreaterThanOrEqual(t3c)
      // age1 token deve ser o maior
      expect(t1).toBe(t2a)
      expect(t1).toBe(t3a)
    }
  })

  it('distribui todos os 18 tokens do pool entre os 6 reinos', () => {
    const POOL = [0, 0, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 6, 8, 8, 8, 10, 10]
    const kingdoms = setupKingdoms(players)
    const allTokens: number[] = []
    for (const k of kingdoms) {
      // Each kingdom has 3 distinct token values stored
      allTokens.push(k.tokens.age3[0], k.tokens.age3[1], k.tokens.age3[2])
    }
    expect(allTokens.sort((a, b) => a - b)).toEqual(POOL.sort((a, b) => a - b))
  })

  it('todos os jogadores começam com 0 marcadores em cada reino', () => {
    const kingdoms = setupKingdoms(players)
    for (const k of kingdoms) {
      for (const p of players) {
        expect(k.markers[p.id]).toBe(0)
      }
    }
  })
})

// ─── beginAge ────────────────────────────────────────────────────────────────

describe('beginAge', () => {
  function baseState(age: number, playerCount: number): FullGameState {
    const players = Array.from({ length: playerCount }, (_, i) => makePlayer(`p${i + 1}`))
    const deck = Array.from({ length: 60 }, () => ally('CENTAURS', 'ORANGE'))
    return makeState({ players, deck, age, market: [] })
  }

  it('cada jogador compra 1 carta no início da era', () => {
    const state = beginAge(baseState(1, 2))
    state.players.forEach(p => expect(p.hand).toHaveLength(1))
  })

  it('mercado tem 2 × número de jogadores cartas', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const state = beginAge(baseState(1, n))
      expect(state.market).toHaveLength(n * 2)
    }
  })

  it('nenhum Dragão aparece na metade superior do deck após beginAge', () => {
    // mid é calculado sobre os aliados antes de inserir os dragões;
    // usamos allyCount (pós-beginAge) como referência em vez de deck.length total.
    for (let i = 0; i < 20; i++) {
      const state = beginAge(baseState(1, 2))
      const allyCount = state.deck.filter(c => c.type === 'ALLY').length
      const topDragons = state.deck.slice(0, Math.floor(allyCount / 2)).filter(c => c.type === 'DRAGON')
      expect(topDragons).toHaveLength(0)
    }
  })

  it('na era 1, o jogador ativo é um dos jogadores da partida', () => {
    const state = beginAge(baseState(1, 3))
    const ids = state.players.map(p => p.id)
    expect(ids).toContain(state.activePlayerId)
  })

  it('na era 2+, o jogador com menos Glória começa', () => {
    const players = [
      makePlayer('p1', { glory: 10 }),
      makePlayer('p2', { glory: 3 }),
      makePlayer('p3', { glory: 7 }),
    ]
    const state = beginAge({ ...baseState(2, 3), players })
    expect(state.activePlayerId).toBe('p2')
  })

  it('descarta cartas da mão dos jogadores para o mercado antes de começar', () => {
    const cardInHand = ally('ELVES', 'BLUE')
    const players = [
      makePlayer('p1', { hand: [cardInHand] }),
      makePlayer('p2'),
    ]
    const state = beginAge(makeState({ players, deck: Array.from({ length: 50 }, () => ally('CENTAURS', 'ORANGE')), market: [] }))
    const allCards = [...state.market, ...state.deck, ...state.players.flatMap(p => p.hand)]
    expect(allCards.some(c => c.id === cardInHand.id)).toBe(true)
    // Nenhum jogador mantém cartas da era anterior
    state.players.forEach(p => {
      expect(p.hand.every(c => c.id !== cardInHand.id)).toBe(true)
    })
  })

  it('bandos são resetados ao iniciar nova era', () => {
    const band = { id: 'b1', cards: [ally('CENTAURS', 'ORANGE')], leaderId: 1, kingdomColor: 'ORANGE' as KingdomColor }
    const players = [makePlayer('p1', { bands: [band] }), makePlayer('p2')]
    const state = beginAge(makeState({ players, deck: Array.from({ length: 50 }, () => ally('CENTAURS', 'ORANGE')), market: [] }))
    state.players.forEach(p => expect(p.bands).toHaveLength(0))
  })
})

// ─── recruitFromDeck ──────────────────────────────────────────────────────────

describe('recruitFromDeck (RECRUIT_FROM_DECK)', () => {
  it('adiciona a carta do topo do deck à mão do jogador', () => {
    const card = ally('CENTAURS', 'ORANGE')
    const state = makeState({ deck: [card] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toBeUndefined()
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.hand).toContainEqual(card)
    expect(result.state.deck).toHaveLength(0)
  })

  it('passa o turno para o próximo jogador', () => {
    const state = makeState({ deck: [ally('CENTAURS', 'ORANGE')] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.state.activePlayerId).toBe('p2')
  })

  it('retorna erro quando o deck está vazio', () => {
    const state = makeState({ deck: [] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toMatch(/empty/i)
  })

  it('retorna erro quando a mão já tem 10 cartas', () => {
    const hand = Array.from({ length: 10 }, () => ally('CENTAURS', 'ORANGE'))
    const players = [makePlayer('p1', { hand }), makePlayer('p2')]
    const state = makeState({ players, deck: [ally('ELVES', 'BLUE')] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toMatch(/full|10/i)
  })

  it('ao revelar Dragão: dragonsRevealed aumenta e carta vai para o mercado', () => {
    const d = dragon()
    const state = makeState({ deck: [d], dragonsRevealed: 0 })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toBeUndefined()
    expect(result.state.dragonsRevealed).toBe(1)
    expect(result.state.market).toContainEqual(d)
    // O Dragão NÃO vai para a mão (divergência documentada: turno encerra)
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.hand).not.toContainEqual(d)
  })

  it('1º e 2º Dragão não encerram a era', () => {
    for (const revealed of [0, 1]) {
      const state = makeState({ deck: [dragon()], dragonsRevealed: revealed })
      const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
      expect(result.state.status).toBe('IN_PROGRESS')
    }
  })

  it('3º Dragão encerra a era imediatamente', () => {
    const state = makeState({ deck: [dragon()], dragonsRevealed: 2, totalAges: 3, age: 1 })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    // Deve haver transição de era (ageTransition) ou mudança de estado
    const isTransition = 'ageTransition' in result && result.ageTransition != null
    const isFinished = result.state.status === 'FINISHED'
    expect(isTransition || isFinished).toBe(true)
  })
})

// ─── recruitFromMarket ────────────────────────────────────────────────────────

describe('recruitFromMarket (RECRUIT_FROM_MARKET)', () => {
  it('remove a carta do mercado e coloca na mão do jogador', () => {
    const card = ally('ELVES', 'BLUE')
    const state = makeState({ market: [card] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_MARKET', cardId: card.id })
    expect(result.error).toBeUndefined()
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.hand).toContainEqual(card)
    expect(result.state.market).not.toContainEqual(card)
  })

  it('passa o turno para o próximo jogador', () => {
    const card = ally('ELVES', 'BLUE')
    const state = makeState({ market: [card] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_MARKET', cardId: card.id })
    expect(result.state.activePlayerId).toBe('p2')
  })

  it('retorna erro se a carta não está no mercado', () => {
    const state = makeState({ market: [] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_MARKET', cardId: 9999 })
    expect(result.error).toBeTruthy()
  })

  it('retorna erro quando a mão já tem 10 cartas', () => {
    const card = ally('ELVES', 'BLUE')
    const hand = Array.from({ length: 10 }, () => ally('CENTAURS', 'ORANGE'))
    const players = [makePlayer('p1', { hand }), makePlayer('p2')]
    const state = makeState({ players, market: [card] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_MARKET', cardId: card.id })
    expect(result.error).toMatch(/full|10/i)
  })

  it('outras cartas do mercado permanecem intactas', () => {
    const target = ally('ELVES', 'BLUE')
    const other = ally('DWARVES', 'RED')
    const state = makeState({ market: [target, other] })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_MARKET', cardId: target.id })
    expect(result.state.market).toContainEqual(other)
    expect(result.state.market).not.toContainEqual(target)
  })
})

// ─── playBand ─────────────────────────────────────────────────────────────────

describe('playBand (PLAY_BAND)', () => {
  it('aceita bando de mesma tribo', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const c2 = ally('CENTAURS', 'BLUE')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    expect(result.error).toBeUndefined()
  })

  it('aceita bando de mesma cor', () => {
    const c1 = ally('CENTAURS', 'RED')
    const c2 = ally('ELVES', 'RED')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    expect(result.error).toBeUndefined()
  })

  it('rejeita bando misto (tribo E cor diferentes)', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const c2 = ally('ELVES', 'BLUE')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    expect(result.error).toBeTruthy()
  })

<<<<<<< HEAD
  it('aceita bando com Halflings misturados com mesma cor', () => {
    const c1 = ally('HALFLINGS', 'ORANGE')
    const c2 = ally('ELVES', 'ORANGE')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c2.id,
    })
    expect(result.error).toBeUndefined()
  })

  it('Minotaur leader can choose any kingdom for markers', () => {
    const c1 = ally('MINOTAURS', 'BLUE')
    const c2 = ally('MINOTAURS', 'GREEN')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id, kingdomColor: 'RED',
    })
    expect(result.error).toBeUndefined()
    expect(result.state.kingdoms.find(k => k.color === 'RED')!.markers['p1']).toBe(2)
  })

  it('Wingfolk monotribo can place markers in any kingdom', () => {
    const c1 = ally('WINGFOLK', 'BLUE')
    const c2 = ally('WINGFOLK', 'GREEN')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id, kingdomColor: 'GRAY',
    })
    expect(result.error).toBeUndefined()
    expect(result.state.kingdoms.find(k => k.color === 'GRAY')!.markers['p1']).toBe(2)
  })

  it('duplica marcadores para bandos de Esqueletos', () => {
    const c1 = ally('SKELETONS', 'RED')
    const c2 = ally('SKELETONS', 'RED')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    const redKingdom = result.state.kingdoms.find(k => k.color === 'RED')!
    expect(redKingdom.markers['p1']).toBe(4)
  })

  it('envia Orcs descartados para o Orc Horde do jogador com líder Orc', () => {
    const orcLeader = ally('ORCS', 'ORANGE')
    const p1Discard = ally('ORCS', 'BLUE')
    const p1Band = ally('CENTAURS', 'BLUE')
    const players = [
      makePlayer('p1', { hand: [p1Discard, p1Band] }),
      makePlayer('p2', { bands: [{ id: 'b0', cards: [orcLeader], leaderId: orcLeader.id, kingdomColor: 'ORANGE' }]}),
    ]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [p1Band.id], leaderId: p1Band.id,
    })
    const p2 = result.state.players.find(p => p.id === 'p2')!
    expect(p2.orcHorde['BLUE']).toBe(1)
    expect(result.state.market).not.toContainEqual(p1Discard)
  })

=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
  it('aceita bando de 1 carta', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const players = [makePlayer('p1', { hand: [c1] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id], leaderId: c1.id,
    })
    expect(result.error).toBeUndefined()
  })

  it('rejeita bando vazio', () => {
    const state = makeState()
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [], leaderId: 0,
    })
    expect(result.error).toBeTruthy()
  })

  it('rejeita Líder que não está no bando', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const c2 = ally('CENTAURS', 'BLUE')
    const outsider = ally('CENTAURS', 'GREEN')
    const players = [makePlayer('p1', { hand: [c1, c2, outsider] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: outsider.id,
    })
    expect(result.error).toMatch(/leader/i)
  })

  it('adiciona marcadores no reino correspondente à cor do bando', () => {
    const c1 = ally('CENTAURS', 'RED')
    const c2 = ally('ELVES', 'RED')
    const c3 = ally('DWARVES', 'RED')
    const players = [makePlayer('p1', { hand: [c1, c2, c3] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id, c3.id], leaderId: c1.id,
    })
    const redKingdom = result.state.kingdoms.find(k => k.color === 'RED')!
    expect(redKingdom.markers['p1']).toBe(3)
  })

  it('bando monotribo: usa a cor do Líder para determinar o reino', () => {
    const c1 = ally('CENTAURS', 'BLUE')
    const c2 = ally('CENTAURS', 'GREEN')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    const blueKingdom = result.state.kingdoms.find(k => k.color === 'BLUE')!
    const greenKingdom = result.state.kingdoms.find(k => k.color === 'GREEN')!
    expect(blueKingdom.markers['p1']).toBe(2)
    expect(greenKingdom.markers['p1']).toBe(0)
  })

  it('descarta todas as cartas restantes da mão para o mercado', () => {
    const inBand = ally('CENTAURS', 'ORANGE')
    const leftOver1 = ally('ELVES', 'BLUE')
    const leftOver2 = ally('DWARVES', 'RED')
    const players = [makePlayer('p1', { hand: [inBand, leftOver1, leftOver2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [inBand.id], leaderId: inBand.id,
    })
    expect(result.state.market).toContainEqual(leftOver1)
    expect(result.state.market).toContainEqual(leftOver2)
    expect(result.state.market).not.toContainEqual(inBand)
  })

  it('mão do jogador fica vazia após jogar bando', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const c2 = ally('CENTAURS', 'BLUE')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.hand).toHaveLength(0)
  })

  it('registra o bando jogado na lista de bandos do jogador', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const c2 = ally('CENTAURS', 'BLUE')
    const players = [makePlayer('p1', { hand: [c1, c2] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id, c2.id], leaderId: c1.id,
    })
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.bands).toHaveLength(1)
    expect(p1.bands[0].cards).toHaveLength(2)
    expect(p1.bands[0].leaderId).toBe(c1.id)
  })

  it('passa o turno para o próximo jogador', () => {
    const c1 = ally('CENTAURS', 'ORANGE')
    const players = [makePlayer('p1', { hand: [c1] }), makePlayer('p2')]
    const state = makeState({ players })
    const result = applyAction(state, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id], leaderId: c1.id,
    })
    expect(result.state.activePlayerId).toBe('p2')
  })

  it('marcadores se acumulam com bandos anteriores no mesmo reino', () => {
    const c1 = ally('CENTAURS', 'RED')
    const ids = ['p1', 'p2']
    const kingdoms = [makeKingdom('RED', ids, undefined, { p1: 3 })]
    const players = [makePlayer('p1', { hand: [c1] }), makePlayer('p2')]
    const state = makeState({ players, kingdoms: [...KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)), ...kingdoms].filter((k, i, arr) => arr.findIndex(x => x.color === k.color) === i) })
    const redBefore = state.kingdoms.find(k => k.color === 'RED')!.markers['p1']

    const result = applyAction({ ...state, kingdoms: [makeKingdom('RED', ids, undefined, { p1: 3 }), ...KINGDOM_DEFS.filter(k => k.color !== 'RED').map(k => makeKingdom(k.color, ids))] }, 'u-p1', {
      type: 'PLAY_BAND', cardIds: [c1.id], leaderId: c1.id,
    })
    const redKingdom = result.state.kingdoms.find(k => k.color === 'RED')!
    expect(redKingdom.markers['p1']).toBe(4)
  })
})

// ─── Pontuação de era (endAge, via 3º Dragão) ─────────────────────────────────

describe('pontuação de era (endAge)', () => {
  function stateWithDragonReady(age: number, players: PlayerState[], kingdoms: Kingdom[]): FullGameState {
    return makeState({
      players,
      kingdoms,
      deck: [dragon()],
      dragonsRevealed: 2,
      age,
      totalAges: 3,
      activePlayerId: players[0].id,
    })
  }

  it('era 1: apenas o 1º colocado por reino recebe token', () => {
    const ids = ['p1', 'p2']
    const kingdoms = [makeKingdom('ORANGE', ids, undefined, { p1: 5, p2: 2 }), ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids))]
    const players = [makePlayer('p1'), makePlayer('p2')]
    const state = stateWithDragonReady(1, players, kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const scored = 'nextState' in result ? result.state : result.state
    const p1 = scored.players.find(p => p.id === 'p1')!
    const p2 = scored.players.find(p => p.id === 'p2')!
    expect(p1.gloryFromKingdoms).toBeGreaterThan(0)
    expect(p2.gloryFromKingdoms).toBe(0)
  })

  it('era 2: 1º e 2º colocados recebem tokens distintos', () => {
    const ids = ['p1', 'p2', 'p3']
    const kingdoms = [
      makeKingdom('ORANGE', ids, { age1: [10], age2: [10, 6], age3: [10, 6, 2] }, { p1: 5, p2: 3, p3: 1 }),
      ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids)),
    ]
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]
    const state = stateWithDragonReady(2, players, kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const scored = result.state
    const p1 = scored.players.find(p => p.id === 'p1')!
    const p2 = scored.players.find(p => p.id === 'p2')!
    const p3 = scored.players.find(p => p.id === 'p3')!
    expect(p1.gloryFromKingdoms).toBe(10)
    expect(p2.gloryFromKingdoms).toBe(6)
    expect(p3.gloryFromKingdoms).toBe(0)
  })

  it('era 3: 1º, 2º e 3º colocados recebem tokens', () => {
    const ids = ['p1', 'p2', 'p3']
    const kingdoms = [
      makeKingdom('ORANGE', ids, { age1: [10], age2: [10, 6], age3: [10, 6, 2] }, { p1: 5, p2: 3, p3: 1 }),
      ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids)),
    ]
    const players = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')]
    const state = stateWithDragonReady(3, players, kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const scored = result.state
    const p1 = scored.players.find(p => p.id === 'p1')!
    const p2 = scored.players.find(p => p.id === 'p2')!
    const p3 = scored.players.find(p => p.id === 'p3')!
    expect(p1.gloryFromKingdoms).toBe(10)
    expect(p2.gloryFromKingdoms).toBe(6)
    expect(p3.gloryFromKingdoms).toBe(2)
  })

  it('empate: ambos os jogadores recebem o token da posição integralmente (sem divisão)', () => {
    const ids = ['p1', 'p2']
    const kingdoms = [
      makeKingdom('ORANGE', ids, { age1: [10], age2: [10, 6], age3: [10, 6, 2] }, { p1: 4, p2: 4 }),
      ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids)),
    ]
    const players = [makePlayer('p1'), makePlayer('p2')]
    const state = stateWithDragonReady(1, players, kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const p1 = result.state.players.find(p => p.id === 'p1')!
    const p2 = result.state.players.find(p => p.id === 'p2')!
    expect(p1.gloryFromKingdoms).toBe(10)
    expect(p2.gloryFromKingdoms).toBe(10)
  })

  it('jogador com 0 marcadores não recebe nenhum token', () => {
    const ids = ['p1', 'p2']
    const kingdoms = [
      makeKingdom('ORANGE', ids, undefined, { p1: 5, p2: 0 }),
      ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids)),
    ]
    const players = [makePlayer('p1'), makePlayer('p2')]
    const state = stateWithDragonReady(1, players, kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const p2 = result.state.players.find(p => p.id === 'p2')!
    expect(p2.gloryFromKingdoms).toBe(0)
  })

  it('pontuação de bandos usa fórmula triangular n*(n+1)/2', () => {
    // 1 carta → 1pt, 2 cartas → 3pt, 3 cartas → 6pt
    const cases: [number, number][] = [[1, 1], [2, 3], [3, 6], [4, 10], [5, 15]]
    for (const [size, expected] of cases) {
      const cards = Array.from({ length: size }, () => ally('CENTAURS', 'ORANGE'))
      const band = { id: 'b1', cards, leaderId: cards[0].id, kingdomColor: 'ORANGE' as KingdomColor }
      const ids = ['p1', 'p2']
      const players = [makePlayer('p1', { bands: [band] }), makePlayer('p2')]
      const state = stateWithDragonReady(1, players, KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)))
      const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
      const p1 = result.state.players.find(p => p.id === 'p1')!
      expect(p1.gloryFromBands, `tamanho ${size}`).toBe(expected)
    }
  })

  it('na última era o status muda para FINISHED', () => {
    const ids = ['p1', 'p2']
    const state = stateWithDragonReady(3, [makePlayer('p1'), makePlayer('p2')], KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)))
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.state.status).toBe('FINISHED')
  })

  it('em era não-final retorna nextState com era incrementada', () => {
    const ids = ['p1', 'p2']
    const state = stateWithDragonReady(1, [makePlayer('p1'), makePlayer('p2')], KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)))
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect('nextState' in result && result.nextState).toBeTruthy()
    if ('nextState' in result && result.nextState) {
      expect(result.nextState.age).toBe(2)
      expect(result.nextState.status).toBe('IN_PROGRESS')
    }
  })

  it('marcadores são resetados na nova era', () => {
    const ids = ['p1', 'p2']
    const kingdoms = [
      makeKingdom('ORANGE', ids, undefined, { p1: 5, p2: 2 }),
      ...KINGDOM_DEFS.filter(k => k.color !== 'ORANGE').map(k => makeKingdom(k.color, ids)),
    ]
    const state = stateWithDragonReady(1, [makePlayer('p1'), makePlayer('p2')], kingdoms)
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    if ('nextState' in result && result.nextState) {
      result.nextState.kingdoms.forEach(k => {
        Object.values(k.markers).forEach(m => expect(m).toBe(0))
      })
    }
  })

  it('na última era, os bandos são preservados para desempate', () => {
    const band = { id: 'b1', cards: [ally('CENTAURS', 'ORANGE'), ally('CENTAURS', 'BLUE')], leaderId: 1, kingdomColor: 'ORANGE' as KingdomColor }
    const ids = ['p1', 'p2']
    const players = [makePlayer('p1', { bands: [band] }), makePlayer('p2')]
    const state = stateWithDragonReady(3, players, KINGDOM_DEFS.map(k => makeKingdom(k.color, ids)))
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    const p1 = result.state.players.find(p => p.id === 'p1')!
    expect(p1.bands).toHaveLength(1)
  })
})

// ─── totalMarkers / lastAgeBandSizes ─────────────────────────────────────────

describe('totalMarkers', () => {
  it('soma marcadores do jogador em todos os reinos', () => {
    const ids = ['p1', 'p2']
    const kingdoms = [
      makeKingdom('ORANGE', ids, undefined, { p1: 3 }),
      makeKingdom('BLUE', ids, undefined, { p1: 2 }),
      ...KINGDOM_DEFS.filter(k => !['ORANGE', 'BLUE'].includes(k.color)).map(k => makeKingdom(k.color, ids)),
    ]
    const player = makePlayer('p1')
    expect(totalMarkers(player, kingdoms)).toBe(5)
  })

  it('retorna 0 para jogador sem marcadores', () => {
    const ids = ['p1', 'p2']
    const kingdoms = KINGDOM_DEFS.map(k => makeKingdom(k.color, ids))
    expect(totalMarkers(makePlayer('p1'), kingdoms)).toBe(0)
  })
})

describe('lastAgeBandSizes', () => {
  it('retorna tamanhos de bandos em ordem decrescente', () => {
    const bands = [
      { id: 'b1', cards: [ally('CENTAURS', 'ORANGE')], leaderId: 1, kingdomColor: 'ORANGE' as KingdomColor },
      { id: 'b2', cards: [ally('CENTAURS', 'BLUE'), ally('CENTAURS', 'RED'), ally('CENTAURS', 'GREEN')], leaderId: 2, kingdomColor: 'BLUE' as KingdomColor },
      { id: 'b3', cards: [ally('ELVES', 'RED'), ally('ELVES', 'ORANGE')], leaderId: 5, kingdomColor: 'RED' as KingdomColor },
    ]
    const player = makePlayer('p1', { bands })
    expect(lastAgeBandSizes(player)).toEqual([3, 2, 1])
  })

  it('retorna array vazio se o jogador não tem bandos', () => {
    expect(lastAgeBandSizes(makePlayer('p1'))).toEqual([])
  })
})

// ─── Guards de applyAction ────────────────────────────────────────────────────

describe('applyAction — guards', () => {
  it('retorna erro se o jogador não está na partida', () => {
    const state = makeState()
    const result = applyAction(state, 'u-naoexiste', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toBeTruthy()
  })

  it('retorna erro se o jogo não está em progresso', () => {
    const state = makeState({ status: 'WAITING' })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toBeTruthy()
  })

  it('retorna erro se não é o turno do jogador', () => {
    const state = makeState({ activePlayerId: 'p2' })
    const result = applyAction(state, 'u-p1', { type: 'RECRUIT_FROM_DECK' })
    expect(result.error).toBeTruthy()
  })
})
