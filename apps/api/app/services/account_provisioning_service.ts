import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import DuplicateException from '#exceptions/duplicate_exception'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import GeneratedPasswordService from '#services/generated_password_service'
import PasswordChallengeService from '#services/password_challenge_service'
import type { RequestAuditContext } from '#types/access'
import type { createAccountValidator } from '#validators/account'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_MESSAGE = 'An account with this email or staff number already exists'
const DUPLICATE_CONSTRAINTS = [
  'people_staff_number_unique',
  'people_primary_email_unique',
  'user_accounts_email_unique',
] as const

type CreateData = Infer<typeof createAccountValidator>

@inject()
export default class AccountProvisioningService {
  constructor(
    private accessEvents: AccessEventService,
    private passwords: GeneratedPasswordService,
    private passwordChallenges: PasswordChallengeService
  ) {}

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

        const challenge = await this.passwordChallenges.issueInitialSetup(
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
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE, DUPLICATE_CONSTRAINTS)
    }
  }
}
