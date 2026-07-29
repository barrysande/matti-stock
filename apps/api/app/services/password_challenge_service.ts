import { inject } from '@adonisjs/core'
import encryption from '@adonisjs/core/services/encryption'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import PasswordResetChallenge from '#models/password_reset_challenge'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import type {
  PasswordChallengePurpose,
  PasswordCredentialToken,
  RequestAuditContext,
} from '#types/access'
import type { forgotPasswordValidator } from '#validators/session'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ForgotPasswordData = Infer<typeof forgotPasswordValidator>

@inject()
export default class PasswordChallengeService {
  constructor(private accessEvents: AccessEventService) {}

  private isPurpose(value: string): value is PasswordChallengePurpose {
    return value === 'INITIAL_SETUP' || value === 'RESET'
  }

  private requestedEventType(purpose: PasswordChallengePurpose) {
    return purpose === 'INITIAL_SETUP' ? 'PASSWORD_SETUP_REQUESTED' : 'PASSWORD_RESET_REQUESTED'
  }

  private async issueChallenge(
    account: UserAccount,
    purpose: PasswordChallengePurpose,
    request: RequestAuditContext,
    trx: TransactionClientContract,
    administrator?: { accountId: string; reason: string }
  ) {
    account.passwordResetVersion = Number(account.passwordResetVersion) + 1
    await account.save()

    const challenge = await PasswordResetChallenge.create(
      {
        accountId: account.id,
        purpose,
        resetVersion: account.passwordResetVersion,
        expiresAt: DateTime.now().plus({ hours: 1 }),
        requestIp: request.ip ?? null,
        requestId: request.requestId ?? null,
      },
      { client: trx }
    )

    await this.accessEvents.record(
      {
        eventType: this.requestedEventType(purpose),
        actorType: administrator ? 'ACCOUNT' : 'SYSTEM',
        actorAccountId: administrator?.accountId,
        targetType: 'USER_ACCOUNT',
        targetId: account.id,
        reason: administrator?.reason,
        request,
        metadata: {
          challengeId: challenge.id,
          purpose,
          resetVersion: account.passwordResetVersion,
        },
      },
      trx
    )

    return challenge
  }

  private async challengePurpose(account: UserAccount, trx: TransactionClientContract) {
    const person = await Person.query({ client: trx })
      .where('id', account.personId)
      .forUpdate()
      .firstOrFail()

    return person.primaryEmailVerifiedAt ? 'RESET' : 'INITIAL_SETUP'
  }

  issueInitialSetup(
    account: UserAccount,
    request: RequestAuditContext,
    trx: TransactionClientContract
  ) {
    return this.issueChallenge(account, 'INITIAL_SETUP', request, trx)
  }

  async issueForAdministration(
    account: UserAccount,
    actorAccountId: string,
    reason: string,
    request: RequestAuditContext,
    trx: TransactionClientContract
  ) {
    const purpose = await this.challengePurpose(account, trx)
    return this.issueChallenge(account, purpose, request, trx, {
      accountId: actorAccountId,
      reason,
    })
  }

  async request(data: ForgotPasswordData, request: RequestAuditContext) {
    return db.transaction(async (trx) => {
      const account = await UserAccount.query({ client: trx })
        .where('email', data.email)
        .forUpdate()
        .first()

      if (!account) {
        await this.accessEvents.record(
          {
            eventType: 'PASSWORD_RESET_REQUESTED_UNKNOWN_ACCOUNT',
            actorType: 'SYSTEM',
            targetType: 'USER_ACCOUNT',
            identifierFingerprint: this.accessEvents.fingerprintIdentifier(data.email),
            request,
          },
          trx
        )
        return null
      }

      if (account.status === 'DEACTIVATED') {
        await this.accessEvents.record(
          {
            eventType: 'PASSWORD_RESET_REJECTED_ACCOUNT_STATUS',
            actorType: 'SYSTEM',
            targetType: 'USER_ACCOUNT',
            targetId: account.id,
            request,
            metadata: { status: account.status },
          },
          trx
        )
        return null
      }

      const purpose = await this.challengePurpose(account, trx)
      return this.issueChallenge(account, purpose, request, trx)
    })
  }

  createToken(challenge: PasswordResetChallenge) {
    if (!this.isPurpose(challenge.purpose)) {
      throw new Error('Cannot create a token for an unsupported password challenge purpose')
    }

    const payload: PasswordCredentialToken = {
      challengeId: challenge.id,
      purpose: challenge.purpose,
      resetVersion: Number(challenge.resetVersion),
    }

    return encryption.encrypt(payload, { expiresIn: '1h', purpose: 'password-credential' })
  }
}
