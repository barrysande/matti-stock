import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import AccessPolicy from '#policies/access_policy'
import AccountCredentialAdministrationService from '#services/account_credential_administration_service'
import AccountDirectoryService from '#services/account_directory_service'
import AccountLifecycleService from '#services/account_lifecycle_service'
import AccountProvisioningService from '#services/account_provisioning_service'
import AccountTransformer from '#transformers/account_transformer'
import {
  administerAccountValidator,
  createAccountValidator,
  indexAccountsValidator,
} from '#validators/account'

@inject()
export default class AccountsController {
  constructor(
    private accountCredentials: AccountCredentialAdministrationService,
    private accountLifecycle: AccountLifecycleService,
    private accountProvisioning: AccountProvisioningService,
    private accountDirectory: AccountDirectoryService
  ) {}

  async store({ auth, bouncer, logger, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('createAccount')

    const payload = await request.validateUsing(createAccountValidator)

    const actor = auth.getUserOrFail()

    const created = await this.accountProvisioning.create(payload, actor.id, {
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

  async resetPassword({ auth, bouncer, logger, params, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('resetPassword')

    const payload = await request.validateUsing(administerAccountValidator)

    const actor = auth.getUserOrFail()

    const recovery = await this.accountCredentials.requestPasswordReset(
      params.id,
      payload,
      actor.id,
      {
        ip: request.ip(),
        requestId: request.id(),
      }
    )

    try {
      await SendPasswordCredentialEmail.dispatch({ challengeId: recovery.challenge.id })
    } catch (error) {
      logger.error(
        {
          err: error,
          challengeId: recovery.challenge.id,
          accountId: recovery.account.id,
        },
        'Failed to enqueue an administrative account credential recovery email'
      )

      return response.ok({
        message: 'Account credential recovery requested, but the email could not be queued.',
      })
    }

    return response.ok({
      message: 'Account credential recovery email has been queued.',
    })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('list')

    const filters = await request.validateUsing(indexAccountsValidator)

    const accounts = await this.accountDirectory.list(filters)

    return serialize(AccountTransformer.paginate(accounts.all(), accounts.getMeta()))
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('view')

    const account = await this.accountDirectory.findDetails(params.id)

    return serialize(AccountTransformer.transform(account).useVariant('forDetailedView'))
  }

  async suspend({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('suspend')

    const payload = await request.validateUsing(administerAccountValidator)

    const actor = auth.getUserOrFail()

    await this.accountLifecycle.suspend(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account suspended.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('restore')

    const payload = await request.validateUsing(administerAccountValidator)

    const actor = auth.getUserOrFail()

    await this.accountLifecycle.restoreSuspended(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account restored.' })
  }

  async deactivate({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('deactivate')

    const payload = await request.validateUsing(administerAccountValidator)

    const actor = auth.getUserOrFail()

    await this.accountLifecycle.deactivate(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Account deactivated.' })
  }

  async reactivate({ auth, bouncer, logger, params, request, response }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('reactivate')

    const payload = await request.validateUsing(administerAccountValidator)

    const actor = auth.getUserOrFail()

    const reactivated = await this.accountLifecycle.reactivate(params.id, payload, actor.id, {
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
}
