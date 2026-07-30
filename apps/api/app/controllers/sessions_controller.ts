import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AuthenticationService from '#services/authentication_service'
import AccessEventService from '#services/access_event_service'
import CurrentAccountTransformer from '#transformers/current_account_transformer'
import { changePasswordValidator, loginValidator } from '#validators/session'

@inject()
export default class SessionsController {
  constructor(
    private authentication: AuthenticationService,
    private accessEvents: AccessEventService
  ) {}

  async login({ request, response, auth, session }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const account = await this.authentication.verifyCredentials(payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (!account) {
      return response.unauthorized({
        code: 'E_INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      })
    }

    await auth.use('web').login(account)
    session.put('auth.credentialVersion', Number(account.credentialVersion))

    return response.ok({ message: 'Login successful.' })
  }

  async changePassword({ request, response, auth }: HttpContext) {
    const payload = await request.validateUsing(changePasswordValidator)
    const account = auth.getUserOrFail()
    const changed = await this.authentication.changePassword(account.id, payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (!changed) {
      return response.badRequest({
        code: 'E_CURRENT_PASSWORD_INVALID',
        message: 'The current password is incorrect.',
      })
    }

    await auth.use('web').logout()
    return response.ok({
      message: 'Password changed. Sign in again with the new password.',
    })
  }

  async me({ auth, serialize }: HttpContext) {
    const resource = await this.authentication.currentAccount(auth.getUserOrFail())
    return serialize(CurrentAccountTransformer.transform(resource))
  }

  async logout({ request, response, auth }: HttpContext) {
    const account = auth.getUserOrFail()
    await auth.use('web').logout()
    await this.accessEvents.record({
      eventType: 'LOGOUT_COMPLETED',
      actorType: 'ACCOUNT',
      actorAccountId: account.id,
      targetType: 'USER_ACCOUNT',
      targetId: account.id,
      request: { ip: request.ip(), requestId: request.id() },
    })

    return response.ok({ message: 'Logged out successfully.' })
  }
}
