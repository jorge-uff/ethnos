import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { Server } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents } from '@ethnos/types'

import prismaPlugin from './plugins/prisma.js'
import authRoutes from './routes/auth.js'
import lobbyRoutes from './routes/lobby.js'
import gameRoutes from './routes/game.js'
import { setIo } from './game/socket.js'

async function start() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: process.env.WEB_URL ?? 'http://localhost:3000' })
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod' })
  await app.register(prismaPlugin)

  await app.register(authRoutes)
  await app.register(lobbyRoutes)
  await app.register(gameRoutes)

  app.get('/health', async () => ({ ok: true }))

  const port = Number(process.env.PORT ?? 3001)
  await app.listen({ port, host: '0.0.0.0' })

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: { origin: process.env.WEB_URL ?? 'http://localhost:3000' },
  })

  setIo(io)

  io.on('connection', (socket) => {
    app.log.info(`Socket connected: ${socket.id}`)
    socket.on('game:join', (gameId) => socket.join(`game:${gameId}`))
    socket.on('game:leave', (gameId) => socket.leave(`game:${gameId}`))
    socket.on('disconnect', () => app.log.info(`Socket disconnected: ${socket.id}`))
  })

  return { app, io }
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
