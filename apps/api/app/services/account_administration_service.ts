import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import GeneratedPasswordService from '#services/generated_password_service'
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
    private passwords: GeneratedPasswordService
  ) {}

  private lockAccount(trx: TransactionClientContract, accountId: string) {
    return UserAccount.query({ client: trx }).where('id', accountId).forUpdate().firstOrFail()
  }

  private async transition(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    allowedFrom: AccountStatus[],
    targetStatus: AccountStatus,
    eventType: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const account = await this.lockAccount(trx, accountId)
      const previousStatus = account.status as AccountStatus

      if (!allowedFrom.includes(previousStatus)) {
        throw new Error(`Cannot change account status from ${previousStatus} to ${targetStatus}`)
      }

      account.status = targetStatus
      account.credentialVersion = Number(account.credentialVersion) + 1
      account.passwordResetVersion = Number(account.passwordResetVersion) + 1
      await account.save()

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
            credentialVersion: account.credentialVersion,
            passwordResetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return account
    })
  }

  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const password = this.passwords.generate()
        const person = await Person.create(
          {
            displayName: data.displayName,
            staffNumber: data.staffNumber ?? null,
            primaryEmail: data.email,
            primaryEmailVerifiedAt: now,
          },
          { client: trx }
        )

        const account = await UserAccount.create(
          {
            personId: person.id,
            email: data.email,
            password,
            status: 'INVITED',
            credentialVersion: 1,
            passwordResetVersion: 0,
          },
          { client: trx }
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
            metadata: { personId: person.id },
          },
          trx
        )

        return { account, person, password }
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE)
    }
  }

  async resetPassword(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const account = await this.lockAccount(trx, accountId)
      const password = this.passwords.generate()

      account.password = password
      account.credentialVersion = Number(account.credentialVersion) + 1
      account.passwordResetVersion = Number(account.passwordResetVersion) + 1
      await account.save()

      await this.accessEvents.record(
        {
          eventType: 'ACCOUNT_PASSWORD_RESET_BY_ADMIN',
          actorType: 'ACCOUNT',
          actorAccountId,
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          reason: data.reason,
          request,
          metadata: {
            credentialVersion: account.credentialVersion,
            passwordResetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return { account, password }
    })
  }

  suspend(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['ACTIVE'],
      'SUSPENDED',
      'ACCOUNT_SUSPENDED',
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
      request
    )
  }

  deactivate(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['INVITED', 'ACTIVE', 'SUSPENDED'],
      'DEACTIVATED',
      'ACCOUNT_DEACTIVATED',
      request
    )
  }

  reactivate(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return this.transition(
      accountId,
      data,
      actorAccountId,
      ['DEACTIVATED'],
      'ACTIVE',
      'ACCOUNT_REACTIVATED',
      request
    )
  }
}
