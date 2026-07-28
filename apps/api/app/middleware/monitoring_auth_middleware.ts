import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class MonitoringAuthMiddleware {
  handle({ request, response }: HttpContext, next: NextFn) {
    const monitoringSecret = request.header('x-monitoring-secret')

    if (monitoringSecret !== env.get('HEALTH_CHECK_SECRET').release()) {
      return response.unauthorized({
        code: 'E_UNAUTHORIZED_ACCESS',
        message: 'Unauthorized access',
      })
    }

    return next()
  }
}
