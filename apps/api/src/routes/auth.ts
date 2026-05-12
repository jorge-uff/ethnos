import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (req, reply) => {
    const { username, email, password } = req.body as {
      username: string
      email: string
      password: string
    }

    const existing = await app.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) {
      return reply.status(409).send({ error: 'Username or email already in use' })
    }

    const hash = await bcrypt.hash(password, 10)
    const user = await app.prisma.user.create({
      data: { username, email, password: hash },
    })

    const token = app.jwt.sign({ id: user.id, username: user.username })
    return reply.send({ token, user: { id: user.id, username: user.username } })
  })

  app.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string' },
          password: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body as { email: string; password: string }

    const user = await app.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ id: user.id, username: user.username })
    return reply.send({ token, user: { id: user.id, username: user.username } })
  })
}
