import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import { env } from './env.js'
import { authRoutes } from './modules/auth/routes.js'
import { errorHandler } from './middleware/error-handler.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
  })

  await app.register(errorHandler)

  await app.register(cors, {
    origin: env.NODE_ENV === 'development' ? 'http://localhost:3000' : false,
    credentials: true,
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'KronoStore API',
        version: '1.0.0',
        description: 'API do e-commerce KronoStore',
      },
      servers: [{ url: `http://localhost:${env.API_PORT}`, description: 'Development' }],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'session_token',
          },
        },
      },
    },
  })

  await app.register(scalar, { routePrefix: '/docs' })

  await app.register(authRoutes)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
