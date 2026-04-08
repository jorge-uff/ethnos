import { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { loadGame, saveGame, broadcastState } from '../game/state.js'
import { applyAction, GameAction } from '../game/actions.js'
import { toClientState } from '../game/setup.js'
import { getIo } from '../game/socket.js'

interface JwtUser {
  id: string
  username: string
}

export default async function gameRoutes(app: FastifyInstance) {
  app.post('/games/:id/action', { preHandler: requireAuth }, async (req, reply) => {
    const user = req.user as JwtUser
    const { id } = req.params as { id: string }
    const action = req.body as GameAction

    const state = await loadGame(app.prisma, id)
    if (!state) return reply.status(404).send({ error: 'Game not found' })

    const result = applyAction(state, user.id, action)
    if (result.error) return reply.status(400).send({ error: result.error })

    await saveGame(app.prisma, result.state)
    broadcastState(getIo(), result.state)

    return reply.send(toClientState(result.state))
  })
}
