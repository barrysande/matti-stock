import { healthChecks } from '#start/health'
import type { HttpContext } from '@adonisjs/core/http'

export default class HealthChecksController {
  /**
   * A dependency-free probe that only confirms the HTTP process can respond.
   */
  async live({ response }: HttpContext) {
    return response.ok({})
  }

  /**
   * A protected probe that reports whether application dependencies are ready.
   */
  async ready({ response }: HttpContext) {
    const report = await healthChecks.run()
    if (report.isHealthy) {
      return response.ok(report)
    }

    return response.serviceUnavailable(report)
  }
}
