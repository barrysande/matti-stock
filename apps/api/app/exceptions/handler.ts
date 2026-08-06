import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * Expected client errors are returned to the caller without being reported
   * as unexpected application failures.
   */
  protected ignoreStatuses = [400, 401, 403, 404, 422, 429]

  /**
   * Known domain conflicts are expected client outcomes. Keeping them
   * code-specific ensures an accidentally classified 409 is still reported.
   */
  protected ignoreCodes = [
    'E_ACCOUNT_CREDENTIAL_RECOVERY_UNAVAILABLE',
    'E_ACCOUNT_SELF_ADMINISTRATION',
    'E_DUPLICATE',
    'E_INVALID_ACCOUNT_TRANSITION',
    'E_INVALID_BASE_UNIT_CHANGE',
    'E_INVALID_CATEGORY_ATTRIBUTE_CHANGE',
    'E_INVALID_CATEGORY_ATTRIBUTE_CHOICE_CHANGE',
    'E_INVALID_CATALOGUE_CATEGORY_CHANGE',
    'E_INVALID_DELEGATION_CHANGE',
    'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE',
    'E_INVALID_PHYSICAL_LOCATION_CHANGE',
    'E_INVALID_ROLE_ASSIGNMENT_CHANGE',
    'E_INVALID_ROLE_CHANGE',
    'E_LAST_ROOT_ACCESS',
    'E_PERSON_PARTICIPATION_CONFLICT',
    'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT',
  ]

  private statusOf(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof error.status === 'number' &&
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status <= 599
    ) {
      return error.status
    }

    return 500
  }

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    const status = this.statusOf(error)
    if (status >= 500) {
      return ctx.response.status(status).send({
        code: 'E_INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      })
    }

    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
