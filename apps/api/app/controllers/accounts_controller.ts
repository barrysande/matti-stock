import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import AccessPolicy from '#policies/access_policy'
import AccountAdministrationService from '#services/account_administration_service'
import { administerAccountValidator, createAccountValidator } from '#validators/account'

@inject()
export default class AccountsController {
  constructor(private accounts: AccountAdministrationService) {}

  async store({ request, response, auth, bouncer, logger }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('createAccount')

    const payload = await request.validateUsing(createAccountValidator)
    const actor = auth.getUserOrFail()
    const created = await this.accounts.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    try {
      await SendPasswordCredentialEmail.dispatch({ challengeId: created.challenge.id })
    } catch (error) {
      logger.error(
        { err: error, challengeId: created.challenge.id, accountId: created.account.id },
        'Failed to enqueue an account password setup email'
      )
      return response.created({
        message: 'Account created, but the password-setting email could not be queued.',
      })
    }

    return response.created({
      message: 'Account created. A password-setting link has been queued.',
    })
  }

  async suspend({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('suspend')

    const payload = await request.validateUsing(administerAccountValidator)
    const actor = auth.getUserOrFail()
    await this.accounts.suspend(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account suspended.' })
  }

  async deactivate({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('deactivate')

    const payload = await request.validateUsing(administerAccountValidator)
    const actor = auth.getUserOrFail()
    await this.accounts.deactivate(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account deactivated.' })
  }

  async reactivate({ params, request, response, auth, bouncer, logger }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('reactivate')

    const payload = await request.validateUsing(administerAccountValidator)
    const actor = auth.getUserOrFail()
    const reactivated = await this.accounts.reactivate(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (!reactivated.challenge) {
      return response.ok({ message: 'Account reactivated.' })
    }

    try {
      await SendPasswordCredentialEmail.dispatch({ challengeId: reactivated.challenge.id })
    } catch (error) {
      logger.error(
        {
          err: error,
          challengeId: reactivated.challenge.id,
          accountId: reactivated.account.id,
        },
        'Failed to enqueue a reactivated account password setup email'
      )
      return response.ok({
        message: 'Account reactivated, but the password-setting email could not be queued.',
      })
    }

    return response.ok({
      message: 'Account reactivated. A password-setting link has been queued.',
    })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('restore')

    const payload = await request.validateUsing(administerAccountValidator)
    const actor = auth.getUserOrFail()
    await this.accounts.restoreSuspended(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account restored.' })
  }
}
