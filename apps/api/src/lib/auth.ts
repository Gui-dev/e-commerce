import { betterAuth } from 'better-auth'
import { env } from '../env.js'

export const auth = betterAuth({
  database: {
    type: 'postgres',
    url: env.DATABASE_URL,
  },
  emailAndPassword: {
    enabled: true,
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    generateId: () => crypto.randomUUID(),
  },
})
