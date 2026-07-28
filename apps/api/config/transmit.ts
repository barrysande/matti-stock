import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/transmit'
import { redis } from '@adonisjs/transmit/transports/redis'

const redisPassword = env.get('REDIS_PASSWORD')?.release()

export default defineConfig({
  pingInterval: '30s',

  /**
   * Functional tests do not need the best-effort SSE message bus. Keeping the
   * transport process-local in tests prevents unrelated API tests from
   * depending on Redis while production and development still exercise the
   * cross-process transport used by the HTTP server and queue worker.
   */
  transport: app.inTest
    ? null
    : {
        driver: redis({
          host: env.get('REDIS_HOST'),
          port: env.get('REDIS_PORT'),
          ...(redisPassword ? { password: redisPassword } : {}),
          keyPrefix: 'matti-stock:transmit',
        }),
      },
})
