import { inject } from '@adonisjs/core'
import { errors as authErrors } from '@adonisjs/auth'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import EffectiveAccessService from '#services/effective_access_service'
import type { RequestAuditContext } from '#types/access'
import type { LoginVerificationResult } from '#types/authentication'
import type { changePasswordValidator, loginValidator } from '#validators/session'
import type { Infer } from '@vinejs/vine/types'

type LoginData = Infer<typeof loginValidator>
type ChangePasswordData = Infer<typeof changePasswordValidator>

@inject()
export default class AuthenticationService {
  constructor(
    private accessEvents: AccessEventService,
    private effectiveAccess: EffectiveAccessService
  ) {}

  /** Verifies credentials and activates an invited account on its first successful login. */
  async verifyCredentials(
    data: LoginData,
    request: RequestAuditContext
  ): Promise<LoginVerificationResult> {
    let verifiedAccount: UserAccount

    try {
      verifiedAccount = await UserAccount.verifyCredentials(data.email, data.password)
    } catch (error) {
      if (!(error instanceof authErrors.E_INVALID_CREDENTIALS)) {
        throw error
      }

      await this.accessEvents.record({
        eventType: 'LOGIN_FAILED',
        actorType: 'SYSTEM',
        targetType: 'USER_ACCOUNT',
        identifierFingerprint: this.accessEvents.fingerprintIdentifier(data.email),
        request,
      })
      return { kind: 'INVALID_CREDENTIALS' }
    }

    if (!['INVITED', 'ACTIVE'].includes(verifiedAccount.status)) {
      await this.accessEvents.record({
        eventType: 'LOGIN_REJECTED_ACCOUNT_STATUS',
        actorType: 'SYSTEM',
        targetType: 'USER_ACCOUNT',
        targetId: verifiedAccount.id,
        request,
        metadata: { status: verifiedAccount.status },
      })
      return { kind: 'ACCOUNT_SIGN_IN_UNAVAILABLE' }
    }

    return db.transaction(async (trx) => {
      const account = await UserAccount.query({ client: trx })
        .where('id', verifiedAccount.id)
        .forUpdate()
        .firstOrFail()
      const wasInvited = account.status === 'INVITED'

      if (!['INVITED', 'ACTIVE'].includes(account.status)) {
        await this.accessEvents.record(
          {
            eventType: 'LOGIN_REJECTED_ACCOUNT_STATUS',
            actorType: 'SYSTEM',
            targetType: 'USER_ACCOUNT',
            targetId: account.id,
            request,
            metadata: { status: account.status },
          },
          trx
        )
        return { kind: 'ACCOUNT_SIGN_IN_UNAVAILABLE' }
      }

      await account.merge({ status: 'ACTIVE', lastLoginAt: DateTime.now() }).save()

      if (wasInvited) {
        await this.accessEvents.record(
          {
            eventType: 'ACCOUNT_ACTIVATED',
            actorType: 'ACCOUNT',
            actorAccountId: account.id,
            targetType: 'USER_ACCOUNT',
            targetId: account.id,
            reason: 'First successful login',
            request,
          },
          trx
        )
      }

      await this.accessEvents.record(
        {
          eventType: 'LOGIN_SUCCEEDED',
          actorType: 'ACCOUNT',
          actorAccountId: account.id,
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          request,
        },
        trx
      )

      return { kind: 'AUTHENTICATED', account }
    })
  }

  /** Replaces an authenticated account's password and invalidates its existing credentials. */
  async changePassword(accountId: string, data: ChangePasswordData, request: RequestAuditContext) {
    return db.transaction(async (trx) => {
      const account = await UserAccount.query({ client: trx })
        .where('id', accountId)
        .forUpdate()
        .firstOrFail()

      if (
        account.status !== 'ACTIVE' ||
        !(await hash.use('argon').verify(account.password, data.currentPassword))
      ) {
        await this.accessEvents.record(
          {
            eventType: 'PASSWORD_CHANGE_REJECTED',
            actorType: 'ACCOUNT',
            actorAccountId: account.id,
            targetType: 'USER_ACCOUNT',
            targetId: account.id,
            request,
          },
          trx
        )
        return false
      }

      await account
        .merge({
          password: data.password,
          credentialVersion: Number(account.credentialVersion) + 1,
          passwordResetVersion: Number(account.passwordResetVersion) + 1,
        })
        .save()

      await this.accessEvents.record(
        {
          eventType: 'PASSWORD_CHANGED',
          actorType: 'ACCOUNT',
          actorAccountId: account.id,
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          reason: 'Authenticated password change',
          request,
          metadata: {
            credentialVersion: account.credentialVersion,
            passwordResetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return true
    })
  }

  /** Loads the authenticated identity and its synchronously effective assignment grants. */
  async currentAccount(account: UserAccount) {
    await account.load('person')
    const grants = await this.effectiveAccess.grantsAcrossScopesForAccount(account.id)
    return { account, person: account.person, grants }
  }
}
