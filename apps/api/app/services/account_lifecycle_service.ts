import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AccountSelfAdministrationException from '#exceptions/account_self_administration_exception'
import InvalidAccountTransitionException from '#exceptions/invalid_account_transition_exception'
import LastRootAccessException from '#exceptions/last_root_access_exception'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import PasswordChallengeService from '#services/password_challenge_service'
import type { AccountStatus, RequestAuditContext } from '#types/access'
import type { administerAccountValidator } from '#validators/account'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type AdministerData = Infer<typeof administerAccountValidator>

@inject()
export default class AccountLifecycleService {
  constructor(
    private accessEvents: AccessEventService,
    private rootAuthority: AccessRootAuthorityService,
    private passwordChallenges: PasswordChallengeService
  ) {}

  private rejectSelfAdministration(accountId: string, actorAccountId: string, message: string) {
    if (accountId === actorAccountId) {
      throw new AccountSelfAdministrationException(message)
    }
  }

  private async lockAndValidate(
    trx: TransactionClientContract,
    accountId: string,
    actorAccountId: string,
    allowedFrom: AccountStatus[],
    protectRoot: boolean,
    now: DateTime<true>
  ) {
    const { actor, target } = await this.rootAuthority.lockAdministrationAccounts(
      trx,
      actorAccountId,
      accountId
    )
    const previousStatus = target.status as AccountStatus

    if (!allowedFrom.includes(previousStatus)) {
      throw new InvalidAccountTransitionException(
        `Cannot perform this account lifecycle transition from ${previousStatus}.`
      )
    }

    if (
      protectRoot &&
      (await this.rootAuthority.isEffective(target.id, trx, now)) &&
      !(await this.rootAuthority.hasOtherEffective(target.id, trx, now))
    ) {
      throw new LastRootAccessException()
    }

    await this.rootAuthority.assertEffectiveActor(actor, trx, now)

    return { account: target, previousStatus }
  }

  private async recordTransition(
    account: UserAccount,
    previousStatus: AccountStatus,
    targetStatus: AccountStatus,
    previousCredentialVersion: number,
    previousPasswordResetVersion: number,
    eventType: string,
    data: AdministerData,
    actorAccountId: string,
    trx: TransactionClientContract,
    request?: RequestAuditContext,
    challenge?: { id: string; purpose: string }
  ) {
    await this.accessEvents.record(
      {
        eventType,
        actorType: 'ACCOUNT',
        actorAccountId,
        targetType: 'USER_ACCOUNT',
        targetId: account.id,
        reason: data.reason,
        request,
        metadata: {
          previousStatus,
          status: targetStatus,
          previousCredentialVersion,
          credentialVersion: Number(account.credentialVersion),
          previousPasswordResetVersion,
          passwordResetVersion: Number(account.passwordResetVersion),
          ...(challenge ? { challengeId: challenge.id, challengePurpose: challenge.purpose } : {}),
        },
      },
      trx
    )
  }

  private async transition(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    allowedFrom: AccountStatus[],
    targetStatus: AccountStatus,
    eventType: string,
    protectRoot: boolean,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const { account, previousStatus } = await this.lockAndValidate(
        trx,
        accountId,
        actorAccountId,
        allowedFrom,
        protectRoot,
        DateTime.now()
      )
      const previousCredentialVersion = Number(account.credentialVersion)
      const previousPasswordResetVersion = Number(account.passwordResetVersion)

      await account
        .merge({
          status: targetStatus,
          credentialVersion: previousCredentialVersion + 1,
          passwordResetVersion: previousPasswordResetVersion + 1,
        })
        .save()

      await this.recordTransition(
        account,
        previousStatus,
        targetStatus,
        previousCredentialVersion,
        previousPasswordResetVersion,
        eventType,
        data,
        actorAccountId,
        trx,
        request
      )

      return account
    })
  }

  suspend(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    this.rejectSelfAdministration(accountId, actorAccountId, 'You cannot suspend your own account.')

    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['ACTIVE'],
      'SUSPENDED',
      'ACCOUNT_SUSPENDED',
      true,
      request
    )
  }

  restoreSuspended(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['SUSPENDED'],
      'ACTIVE',
      'ACCOUNT_SUSPENSION_ENDED',
      false,
      request
    )
  }

  deactivate(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    this.rejectSelfAdministration(
      accountId,
      actorAccountId,
      'You cannot deactivate your own account.'
    )

    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['INVITED', 'ACTIVE', 'SUSPENDED'],
      'DEACTIVATED',
      'ACCOUNT_DEACTIVATED',
      true,
      request
    )
  }

  reactivate(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const { account, previousStatus } = await this.lockAndValidate(
        trx,
        accountId,
        actorAccountId,
        ['DEACTIVATED'],
        false,
        DateTime.now()
      )
      const person = await Person.query({ client: trx })
        .where('id', account.personId)
        .forUpdate()
        .firstOrFail()
      const previousCredentialVersion = Number(account.credentialVersion)
      const previousPasswordResetVersion = Number(account.passwordResetVersion)
      const targetStatus: AccountStatus = person.primaryEmailVerifiedAt ? 'ACTIVE' : 'INVITED'

      await account
        .merge({
          status: targetStatus,
          credentialVersion: previousCredentialVersion + 1,
          ...(targetStatus === 'ACTIVE'
            ? { passwordResetVersion: previousPasswordResetVersion + 1 }
            : {}),
        })
        .save()

      const challenge =
        targetStatus === 'INVITED'
          ? await this.passwordChallenges.issueInitialSetup(account, request ?? {}, trx)
          : null

      await this.recordTransition(
        account,
        previousStatus,
        targetStatus,
        previousCredentialVersion,
        previousPasswordResetVersion,
        'ACCOUNT_REACTIVATED',
        data,
        actorAccountId,
        trx,
        request,
        challenge ?? undefined
      )

      return { account, challenge }
    })
  }
}
