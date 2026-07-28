import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import AccessEventService from '#services/access_event_service'

@inject()
export default class AuthMiddleware {
  constructor(private accessEvents: AccessEventService) {}

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: { guards?: (keyof Authenticators)[] } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards)
    const account = ctx.auth.getUserOrFail()
    const sessionCredentialVersion = Number(ctx.session.get('auth.credentialVersion'))
    const accountCredentialVersion = Number(account.credentialVersion)

    if (
      !['INVITED', 'ACTIVE'].includes(account.status) ||
      !Number.isInteger(sessionCredentialVersion) ||
      sessionCredentialVersion !== accountCredentialVersion
    ) {
      await ctx.auth.use('web').logout()
      await this.accessEvents.record({
        eventType: 'SESSION_INVALIDATED',
        actorType: 'ACCOUNT',
        actorAccountId: account.id,
        targetType: 'USER_ACCOUNT',
        targetId: account.id,
        request: { ip: ctx.request.ip(), requestId: ctx.request.id() },
        metadata: {
          accountStatus: account.status,
          accountCredentialVersion,
          sessionCredentialVersion: Number.isInteger(sessionCredentialVersion)
            ? sessionCredentialVersion
            : null,
        },
      })
      return ctx.response.unauthorized({
        code: 'E_UNAUTHORIZED_ACCESS',
        message: 'Authentication is required.',
      })
    }

    return next()
  }
}
