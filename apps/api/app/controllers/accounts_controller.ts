import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import AccessPolicy from '#policies/access_policy'
import AccountAdministrationService from '#services/account_administration_service'
import { createAccountValidator } from '#validators/account'

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
}
