import env from '#start/env'
import { defineConfig, drivers, exponentialBackoff } from '@adonisjs/queue'

export default defineConfig({
  default: env.get('QUEUE_DRIVER', 'database'),

  adapters: {
    database: drivers.database({
      connectionName: 'pg',
    }),
    sync: drivers.sync(),
  },

  worker: {
    concurrency: 5,
    idleDelay: '2s',
  },

  queues: {
    emails: {
      retry: {
        maxRetries: 3,
        backoff: exponentialBackoff({
          baseDelay: '5s',
          maxDelay: '5m',
          multiplier: 2,
          jitter: true,
        }),
      },
    },
  },

  locations: ['./app/jobs/**/*.{ts,js}'],
})
