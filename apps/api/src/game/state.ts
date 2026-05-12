import { PrismaClient, Prisma } from '@prisma/client'
import { Server } from 'socket.io'
import { FullGameState, ClientGameState, GiantTokenState } from './types.js'
import { toClientState } from './setup.js'

// Stored in game.giantToken JSONB — holds both giant token and orc power state
interface StoredPowerState {
  giantTokenHolder: string | null
  giantTokenBandSize: number
  orcPowerPlayerId: string | null
}

export async function loadGame(prisma: PrismaClient, gameId: string): Promise<FullGameState | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { players: { include: { user: { select: { username: true } } } } },
  })
  if (!game) return null

  const ps = game.giantToken as StoredPowerState | null
  const giantToken: GiantTokenState | null =
    ps?.giantTokenHolder ? { heldByPlayerId: ps.giantTokenHolder, bandSize: ps.giantTokenBandSize ?? 0 } : null

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
    giantToken,
    orcPowerPlayerId: ps?.orcPowerPlayerId ?? null,
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
      merfolkPosition: p.merfolkPosition,
      // orcHorde stored as JSONB number; legacy rows may be {} object
      orcHorde: typeof p.orcHorde === 'number' ? p.orcHorde : 0,
      trollTokens: (p.trollTokens as number[]).reduce((s, n) => s + n, 0),
    })),
  }
}

export async function saveGame(prisma: PrismaClient, state: FullGameState): Promise<void> {
  const powerState: StoredPowerState = {
    giantTokenHolder: state.giantToken?.heldByPlayerId ?? null,
    giantTokenBandSize: state.giantToken?.bandSize ?? 0,
    orcPowerPlayerId: state.orcPowerPlayerId ?? null,
  }

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
      giantToken: powerState as unknown as Prisma.InputJsonValue,
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
        merfolkPosition: player.merfolkPosition,
        orcHorde: player.orcHorde as unknown as Prisma.InputJsonValue,
        trollTokens: [player.trollTokens],
      },
    })
  }
}

export function broadcastState(io: Server, state: FullGameState): void {
  const clientState: ClientGameState = toClientState(state)
  io.to(`game:${state.id}`).emit('game:state', clientState as any)
}
