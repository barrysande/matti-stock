import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import AccountSelfAdministrationException from '#exceptions/account_self_administration_exception'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidAccountTransitionException from '#exceptions/invalid_account_transition_exception'
import LastRootAccessException from '#exceptions/last_root_access_exception'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import AccessEventService from '#services/access_event_service'
import GeneratedPasswordService from '#services/generated_password_service'
import PasswordCredentialService from '#services/password_credential_service'
import type { AccountStatus, RequestAuditContext } from '#types/access'
import type { administerAccountValidator, createAccountValidator } from '#validators/account'
import type { Infer } from '@vinejs/vine/types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const DUPLICATE_MESSAGE = 'An account with this email or staff number already exists'

type CreateData = Infer<typeof createAccountValidator>
type AdministerData = Infer<typeof administerAccountValidator>

@inject()
export default class AccountAdministrationService {
  constructor(
    private accessEvents: AccessEventService,
    private rootAuthority: AccessRootAuthorityService,
    private passwords: GeneratedPasswordService,
    private passwordCredentials: PasswordCredentialService
  ) {}

  private lockAccount(trx: TransactionClientContract, accountId: string) {
    return UserAccount.query({ client: trx }).where('id', accountId).forUpdate().firstOrFail()
  }

  private rejectSelfAdministration(accountId: string, actorAccountId: string) {
    if (accountId === actorAccountId) {
      throw new AccountSelfAdministrationException()
    }
  }

  private async lockAndValidate(
    trx: TransactionClientContract,
    accountId: string,
    actorAccountId: string,
    allowedFrom: AccountStatus[],
    protectRoot: boolean,
    now: DateTime
  ) {
    await this.rootAuthority.lockMutations(trx)

    const actor = await this.lockAccount(trx, actorAccountId)
    const account = await this.lockAccount(trx, accountId)
    const previousStatus = account.status as AccountStatus

    if (!allowedFrom.includes(previousStatus)) {
      throw new InvalidAccountTransitionException(
        `Cannot perform this account lifecycle transition from ${previousStatus}.`
      )
    }

    if (
      protectRoot &&
      (await this.rootAuthority.isEffective(account.id, trx, now)) &&
      !(await this.rootAuthority.hasOtherEffective(account.id, trx, now))
    ) {
      throw new LastRootAccessException()
    }

    if (actor.status !== 'ACTIVE' || !(await this.rootAuthority.isEffective(actor.id, trx, now))) {
      throw new AccessAuthorityChangedException()
    }

    return { account, previousStatus }
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
      const now = DateTime.now()
      const { account, previousStatus } = await this.lockAndValidate(
        trx,
        accountId,
        actorAccountId,
        allowedFrom,
        protectRoot,
        now
      )
      const previousCredentialVersion = Number(account.credentialVersion)
      const previousPasswordResetVersion = Number(account.passwordResetVersion)

      account.status = targetStatus
      account.credentialVersion = previousCredentialVersion + 1
      account.passwordResetVersion = previousPasswordResetVersion + 1
      await account.save()

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

  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    try {
      return await db.transaction(async (trx) => {
        const temporaryPassword = this.passwords.generate()
        const person = await Person.create(
          {
            displayName: data.displayName,
            staffNumber: data.staffNumber ?? null,
            primaryEmail: data.email,
            primaryEmailVerifiedAt: null,
          },
          { client: trx }
        )

        const account = await UserAccount.create(
          {
            personId: person.id,
            email: data.email,
            password: temporaryPassword,
            status: 'INVITED',
            credentialVersion: 1,
            passwordResetVersion: 0,
          },
          { client: trx }
        )

        const challenge = await this.passwordCredentials.issueInitialSetup(
          account,
          request ?? {},
          trx
        )

        await this.accessEvents.record(
          {
            eventType: 'ACCOUNT_CREATED',
            actorType: 'ACCOUNT',
            actorAccountId,
            targetType: 'USER_ACCOUNT',
            targetId: account.id,
            reason: data.reason,
            request,
            metadata: {
              personId: person.id,
              challengeId: challenge.id,
              challengePurpose: challenge.purpose,
            },
          },
          trx
        )

        return { account, challenge, person }
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE)
    }
  }

  suspend(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    this.rejectSelfAdministration(accountId, actorAccountId)

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
    this.rejectSelfAdministration(accountId, actorAccountId)

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
      const now = DateTime.now()
      const { account, previousStatus } = await this.lockAndValidate(
        trx,
        accountId,
        actorAccountId,
        ['DEACTIVATED'],
        false,
        now
      )
      const person = await Person.query({ client: trx })
        .where('id', account.personId)
        .forUpdate()
        .firstOrFail()
      const previousCredentialVersion = Number(account.credentialVersion)
      const previousPasswordResetVersion = Number(account.passwordResetVersion)
      const targetStatus: AccountStatus = person.primaryEmailVerifiedAt ? 'ACTIVE' : 'INVITED'

      account.status = targetStatus
      account.credentialVersion = previousCredentialVersion + 1

      if (targetStatus === 'ACTIVE') {
        account.passwordResetVersion = previousPasswordResetVersion + 1
      }

      await account.save()

      const challenge =
        targetStatus === 'INVITED'
          ? await this.passwordCredentials.issueInitialSetup(account, request ?? {}, trx)
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
