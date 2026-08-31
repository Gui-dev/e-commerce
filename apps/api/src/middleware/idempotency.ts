import { createHash } from 'node:crypto'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../lib/db/index.js'
import { idempotencyKeys } from '../lib/db/schema.js'
import { eq } from 'drizzle-orm'

export function computeBodyHash(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex')
}

export async function idempotencyMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['idempotency-key'] as string | undefined

  if (!key) return

  const bodyHash = computeBodyHash(request.body)

  const existing = await db.query.idempotencyKeys.findFirst({
    where: eq(idempotencyKeys.key, key),
  })

  if (existing) {
    if (existing.requestBodyHash !== bodyHash) {
      return reply.code(409).send({
        error: 'CONFLICT',
        message: 'Idempotency key reused with different request body',
      })
    }
    return reply.code(existing.responseStatus).send(existing.responseBody)
  }

  await db.insert(idempotencyKeys).values({
    key,
    userId: request.user?.id,
    requestMethod: request.method,
    requestPath: request.url,
    requestBodyHash: bodyHash,
    responseStatus: 0,
    responseBody: {},
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  })

  const originalSend = reply.send.bind(reply)
  reply.send = async function (body: unknown) {
    await db
      .update(idempotencyKeys)
      .set({ responseStatus: reply.statusCode, responseBody: body })
      .where(eq(idempotencyKeys.key, key))
    return originalSend(body)
  }
}
