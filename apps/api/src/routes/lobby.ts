import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { initGame } from '../game/setup.js'
import { loadGame, saveGame, broadcastState } from '../game/state.js'
import { getIo } from '../game/socket.js'

interface JwtUser {
  id: string
  username: string
}

const ADJECTIVES = [
  'Antigo', 'Carmesim', 'Sombrio', 'Élfico', 'Esquecido', 'Dourado',
  'Férreo', 'Místico', 'Prateado', 'Pétreo', 'Selvagem', 'Eterno',
  'Glorioso', 'Lendário', 'Maldito', 'Nobre', 'Sagrado', 'Tempestuoso',
]

const NOUNS = [
  'Trono', 'Reino', 'Pacto', 'Horda', 'Legião', 'Vale',
  'Bastião', 'Covil', 'Conselho', 'Domínio', 'Aliança', 'Bando',
  'Portal', 'Exército', 'Clan', 'Conclave',
]

function generateGameName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}

export default async function lobbyRoutes(app: FastifyInstance) {
  // List open games — normalized format
  app.get('/games', async (_req, reply) => {
    const games = await app.prisma.game.findMany({
      where: { status: 'WAITING' },
      include: { players: { include: { user: { select: { username: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    const normalized = games.map(g => ({
      id: g.id,
      name: g.name,
      status: g.status,
      totalAges: g.totalAges,
      players: g.players.map(p => ({
        id: p.id,
        color: p.color,
        username: p.user.username,
      })),
    }))
    return reply.send(normalized)
  })

  // Create game
  app.post('/games', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { maxPlayers = 4 } = req.body as { maxPlayers?: number }

    if (maxPlayers < 2 || maxPlayers > 6) {
      return reply.status(400).send({ error: 'maxPlayers must be between 2 and 6' })
    }

    const game = await app.prisma.game.create({
      data: {
        name: generateGameName(),
        status: 'WAITING',
        totalAges: maxPlayers <= 3 ? 2 : 3,
        activeTribes: [],
        deckState: [],
        marketState: [],
        kingdomState: [],
        players: {
          create: {
            userId: user.id,
            color: 'WHITE',
            handState: [],
            bandsState: [],
            orcHorde: {},
<<<<<<< HEAD
            merfolkPosition: 0,
            trollTokens: [],
=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
          },
        },
      },
      include: {
        players: {
          include: { user: { select: { username: true } } },
        },
      },
    })

    return reply.status(201).send(game)
  })

  // Get single game — returns normalized ClientGameState format
  app.get('/games/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const state = await loadGame(app.prisma, id)
    if (!state) return reply.status(404).send({ error: 'Game not found' })
    const { toClientState } = await import('../game/setup.js')
    return reply.send(toClientState(state))
  })

  // Join game
  app.post('/games/:id/join', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { id } = req.params as { id: string }

    const game = await app.prisma.game.findUnique({
      where: { id },
      include: { players: true },
    })

    if (!game) return reply.status(404).send({ error: 'Game not found' })
    if (game.status !== 'WAITING') return reply.status(400).send({ error: 'Game already started' })

    const alreadyIn = game.players.some(p => p.userId === user.id)
    if (alreadyIn) return reply.status(400).send({ error: 'Already in this game' })

    const colors = ['WHITE', 'BLACK', 'BLUE', 'YELLOW', 'GREEN', 'PURPLE'] as const
    const usedColors = game.players.map(p => p.color)
    const availableColor = colors.find(c => !usedColors.includes(c))

    if (!availableColor) return reply.status(400).send({ error: 'Game is full' })

    const updated = await app.prisma.game.update({
      where: { id },
      data: {
        players: {
          create: {
            userId: user.id,
            color: availableColor,
            handState: [],
            bandsState: [],
            orcHorde: {},
<<<<<<< HEAD
            merfolkPosition: 0,
            trollTokens: [],
=======
>>>>>>> a9845801fc65991191c9a005b225be4f685d6715
          },
        },
      },
      include: {
        players: {
          include: { user: { select: { username: true } } },
        },
      },
    })

    const fullState = await loadGame(app.prisma, id)
    if (fullState) broadcastState(getIo(), fullState)

    return reply.send(updated)
  })

  // Leave game (only while WAITING)
  app.post('/games/:id/leave', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { id } = req.params as { id: string }

    const game = await app.prisma.game.findUnique({
      where: { id },
      include: { players: true },
    })

    if (!game) return reply.status(404).send({ error: 'Game not found' })
    if (game.status !== 'WAITING') return reply.status(400).send({ error: 'Cannot leave a game in progress' })

    const player = game.players.find(p => p.userId === user.id)
    if (!player) return reply.status(400).send({ error: 'Not in this game' })

    await app.prisma.player.delete({ where: { id: player.id } })

    // If lobby is empty, delete the game
    if (game.players.length === 1) {
      await app.prisma.game.delete({ where: { id } })
      return reply.send({ deleted: true })
    }

    const updated = await app.prisma.game.findUnique({
      where: { id },
      include: { players: { include: { user: { select: { username: true } } } } },
    })

    const fullState = await loadGame(app.prisma, id)
    if (fullState) broadcastState(getIo(), fullState)

    return reply.send(updated)
  })

  // Start game
  app.post('/games/:id/start', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { id } = req.params as { id: string }

    const game = await app.prisma.game.findUnique({
      where: { id },
      include: { players: true },
    })

    if (!game) return reply.status(404).send({ error: 'Game not found' })
    if (game.status !== 'WAITING') return reply.status(400).send({ error: 'Game already started' })
    if (game.players.length < 2) return reply.status(400).send({ error: 'Need at least 2 players' })

    // Only the first player (creator) can start
    const isCreator = game.players[0].userId === user.id
    if (!isCreator) return reply.status(403).send({ error: 'Only the game creator can start' })

    // Load full game (with usernames)
    const fullGame = await loadGame(app.prisma, id)
    if (!fullGame) return reply.status(404).send({ error: 'Game not found' })

    const initialState = initGame({
      id: fullGame.id,
      totalAges: fullGame.totalAges,
      players: fullGame.players,
    })

    await saveGame(app.prisma, initialState)

    const { getIo } = await import('../game/socket.js')
    broadcastState(getIo(), initialState)

    return reply.send({ ok: true })
  })
}
