import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { loadGame, saveGame, broadcastState } from '../game/state.js'
import { applyAction, GameAction } from '../game/actions.js'
import { toClientState } from '../game/setup.js'
import { getIo } from '../game/socket.js'
import type { IAgeEndedPayload } from '@ethnos/types'

interface JwtUser {
  id: string
  username: string
}

const AGE_TRANSITION_DELAY_MS = 8000

export default async function gameRoutes(app: FastifyInstance) {
  app.post('/games/:id/action', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { id } = req.params as { id: string }
    const action = req.body as GameAction

    const state = await loadGame(app.prisma, id)
    if (!state) return reply.status(404).send({ error: 'Game not found' })

    const result = applyAction(state, user.id, action)
    if (result.error) return reply.status(400).send({ error: result.error })

    if (result.ageTransition) {
      const { ageTransition, nextState } = result

      // Persist the next-age state immediately so the server is always consistent
      await saveGame(app.prisma, nextState)

      // Build the scoring payload for all clients
      const payload: IAgeEndedPayload = {
        age: ageTransition.age,
        kingdomResults: ageTransition.kingdomResults.map(kr => ({
          kingdomColor: kr.kingdomColor,
          placements: kr.placements.map(pl => ({
            playerId: pl.playerId,
            username: result.state.players.find(p => p.id === pl.playerId)?.username ?? '',
            markers: pl.markers,
            reward: pl.reward,
          })),
        })),
        playerScores: result.state.players.map(p => ({
          playerId: p.id,
          username: p.username,
          gloryFromKingdoms: ageTransition.kingdomResults
            .flatMap(kr => kr.placements)
            .filter(pl => pl.playerId === p.id)
            .reduce((sum, pl) => sum + pl.reward, 0),
          gloryFromBands: ageTransition.bandGloryPerPlayer[p.id] ?? 0,
          totalGlory: p.glory,
        })),
      }

      getIo().to(`game:${state.id}`).emit('game:age-ended', payload)

      // After the transition delay, push the new age state to all clients
      setTimeout(() => {
        broadcastState(getIo(), nextState)
      }, AGE_TRANSITION_DELAY_MS)

      // Return the scored state (old age, updated glory) to the REST caller so
      // their client also shows the transition screen
      return reply.send(toClientState(result.state))
    }

    await saveGame(app.prisma, result.state)
    broadcastState(getIo(), result.state)

    return reply.send(toClientState(result.state))
  })
}
