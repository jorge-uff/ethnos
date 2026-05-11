import { PrismaClient, Prisma } from '@prisma/client'
import { Server } from 'socket.io'
import { FullGameState, ClientGameState } from './types.js'
import { toClientState } from './setup.js'

export async function loadGame(prisma: PrismaClient, gameId: string): Promise<FullGameState | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { include: { user: { select: { username: true } } } } },
  })
  if (!game) return null

  return {
    id: game.id,
    status: game.status as FullGameState['status'],
    age: game.age,
    totalAges: game.totalAges,
    activeTribes: game.activeTribes as FullGameState['activeTribes'],
    deck: game.deckState as unknown as FullGameState['deck'],
    market: game.marketState as unknown as FullGameState['market'],
    kingdoms: game.kingdomState as unknown as FullGameState['kingdoms'],
    activePlayerId: game.activePlayerId,
    dragonsRevealed: game.dragonsRevealed,
    players: game.players.map(p => ({
      id: p.id,
      userId: p.userId,
      username: p.user.username,
      color: p.color,
      glory: p.glory,
      gloryFromKingdoms: p.gloryFromKingdoms,
      gloryFromBands: p.gloryFromBands,
      hand: p.handState as unknown as FullGameState['players'][0]['hand'],
      bands: p.bandsState as unknown as FullGameState['players'][0]['bands'],
    })),
  }
}

export async function saveGame(prisma: PrismaClient, state: FullGameState): Promise<void> {
  await prisma.game.update({
    where: { id: state.id },
    data: {
      status: state.status,
      age: state.age,
      activeTribes: state.activeTribes,
      deckState: state.deck as unknown as Prisma.InputJsonValue,
      marketState: state.market as unknown as Prisma.InputJsonValue,
      kingdomState: state.kingdoms as unknown as Prisma.InputJsonValue,
      activePlayerId: state.activePlayerId,
      dragonsRevealed: state.dragonsRevealed,
    },
  })

  for (const player of state.players) {
    await prisma.player.update({
      where: { id: player.id },
      data: {
        glory: player.glory,
        gloryFromKingdoms: player.gloryFromKingdoms,
        gloryFromBands: player.gloryFromBands,
        handState: player.hand as unknown as Prisma.InputJsonValue,
        bandsState: player.bands as unknown as Prisma.InputJsonValue,
      },
    })
  }
}

export function broadcastState(io: Server, state: FullGameState): void {
  const clientState: ClientGameState = toClientState(state)
  io.to(`game:${state.id}`).emit('game:state', clientState as any)
}
