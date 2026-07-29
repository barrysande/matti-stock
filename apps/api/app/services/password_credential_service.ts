import { inject } from '@adonisjs/core'
import encryption from '@adonisjs/core/services/encryption'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import PasswordResetChallenge from '#models/password_reset_challenge'
import PasswordResetRedemption from '#models/password_reset_redemption'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import type {
  PasswordChallengePurpose,
  PasswordCredentialToken,
  RequestAuditContext,
} from '#types/access'
import type { resetPasswordValidator, setPasswordValidator } from '#validators/session'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ResetPasswordData = Infer<typeof resetPasswordValidator>
type SetPasswordData = Infer<typeof setPasswordValidator>
type PasswordCredentialData = ResetPasswordData | SetPasswordData
type PasswordCredentialRejectionReason =
  | 'INVALID_TOKEN'
  | 'CHALLENGE_NOT_FOUND'
  | 'EXPIRED'
  | 'WRONG_PURPOSE'
  | 'SUPERSEDED'
  | 'ALREADY_REDEEMED'

interface PasswordCredentialRejection {
  reason: PasswordCredentialRejectionReason
  accountId?: string
  challengeId?: string
  client?: TransactionClientContract
}

@inject()
export default class PasswordCredentialService {
  constructor(private accessEvents: AccessEventService) {}

  private isPurpose(value: unknown): value is PasswordChallengePurpose {
    return value === 'INITIAL_SETUP' || value === 'RESET'
  }

  private rejectionEventType(purpose: PasswordChallengePurpose) {
    return purpose === 'INITIAL_SETUP' ? 'PASSWORD_SETUP_REJECTED' : 'PASSWORD_RESET_REJECTED'
  }

  private completedEventType(purpose: PasswordChallengePurpose) {
    return purpose === 'INITIAL_SETUP' ? 'ACCOUNT_PASSWORD_SET' : 'PASSWORD_RESET_COMPLETED'
  }

  private recordRejectedCredential(
    purpose: PasswordChallengePurpose,
    rejection: PasswordCredentialRejection,
    request: RequestAuditContext
  ) {
    const metadata: Record<string, unknown> = {
      reason: rejection.reason,
      purpose,
    }
    if (rejection.challengeId) {
      metadata.challengeId = rejection.challengeId
    }

    return this.accessEvents.record(
      {
        eventType: this.rejectionEventType(purpose),
        actorType: 'SYSTEM',
        targetType: 'USER_ACCOUNT',
        targetId: rejection.accountId,
        request,
        metadata,
      },
      rejection.client
    )
  }

  private async redeem(
    data: PasswordCredentialData,
    expectedPurpose: PasswordChallengePurpose,
    request: RequestAuditContext
  ) {
    const payload = encryption.decrypt(
      data.token,
      'password-credential'
    ) as PasswordCredentialToken | null
    if (
      !payload ||
      typeof payload.challengeId !== 'string' ||
      !this.isPurpose(payload.purpose) ||
      !Number.isInteger(payload.resetVersion)
    ) {
      await this.recordRejectedCredential(expectedPurpose, { reason: 'INVALID_TOKEN' }, request)
      return false
    }

    return db.transaction(async (trx) => {
      const challenge = await PasswordResetChallenge.query({ client: trx })
        .where('id', payload.challengeId)
        .forUpdate()
        .first()
      if (!challenge) {
        await this.recordRejectedCredential(
          expectedPurpose,
          {
            reason: 'CHALLENGE_NOT_FOUND',
            challengeId: payload.challengeId,
            client: trx,
          },
          request
        )
        return false
      }

      if (challenge.expiresAt <= DateTime.now()) {
        await this.recordRejectedCredential(
          expectedPurpose,
          {
            reason: 'EXPIRED',
            accountId: challenge.accountId,
            challengeId: challenge.id,
            client: trx,
          },
          request
        )
        return false
      }

      const account = await UserAccount.query({ client: trx })
        .where('id', challenge.accountId)
        .forUpdate()
        .firstOrFail()

      if (payload.purpose !== expectedPurpose || challenge.purpose !== expectedPurpose) {
        await this.recordRejectedCredential(
          expectedPurpose,
          {
            reason: 'WRONG_PURPOSE',
            accountId: account.id,
            challengeId: challenge.id,
            client: trx,
          },
          request
        )
        return false
      }

      const redemption = await PasswordResetRedemption.query({ client: trx })
        .where('challenge_id', challenge.id)
        .first()
      if (redemption) {
        await this.recordRejectedCredential(
          expectedPurpose,
          {
            reason: 'ALREADY_REDEEMED',
            accountId: account.id,
            challengeId: challenge.id,
            client: trx,
          },
          request
        )
        return false
      }

      if (
        Number(challenge.resetVersion) !== payload.resetVersion ||
        Number(account.passwordResetVersion) !== payload.resetVersion
      ) {
        await this.recordRejectedCredential(
          expectedPurpose,
          {
            reason: 'SUPERSEDED',
            accountId: account.id,
            challengeId: challenge.id,
            client: trx,
          },
          request
        )
        return false
      }

      await PasswordResetRedemption.create(
        {
          challengeId: challenge.id,
          accountId: account.id,
          requestIp: request.ip ?? null,
          requestId: request.requestId ?? null,
        },
        { client: trx }
      )

      account.password = data.password
      account.credentialVersion = Number(account.credentialVersion) + 1
      account.passwordResetVersion = Number(account.passwordResetVersion) + 1
      await account.save()

      if (expectedPurpose === 'INITIAL_SETUP') {
        const person = await Person.query({ client: trx })
          .where('id', account.personId)
          .forUpdate()
          .firstOrFail()
        person.primaryEmailVerifiedAt = person.primaryEmailVerifiedAt ?? DateTime.now()
        await person.save()
      }

      await this.accessEvents.record(
        {
          eventType: this.completedEventType(expectedPurpose),
          actorType: 'SYSTEM',
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          request,
          metadata: {
            challengeId: challenge.id,
            purpose: expectedPurpose,
            credentialVersion: account.credentialVersion,
            passwordResetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return true
    })
  }

  reset(data: ResetPasswordData, request: RequestAuditContext) {
    return this.redeem(data, 'RESET', request)
  }

  setup(data: SetPasswordData, request: RequestAuditContext) {
    return this.redeem(data, 'INITIAL_SETUP', request)
  }
}
