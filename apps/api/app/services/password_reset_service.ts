import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import encryption from '@adonisjs/core/services/encryption'
import { DateTime } from 'luxon'
import UserAccount from '#models/user_account'
import PasswordResetChallenge from '#models/password_reset_challenge'
import PasswordResetRedemption from '#models/password_reset_redemption'
import AccessEventService from '#services/access_event_service'
import type { PasswordResetToken, RequestAuditContext } from '#types/access'
import type { forgotPasswordValidator, resetPasswordValidator } from '#validators/session'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ForgotPasswordData = Infer<typeof forgotPasswordValidator>
type ResetPasswordData = Infer<typeof resetPasswordValidator>
type PasswordResetRejectionReason =
  'INVALID_TOKEN' | 'CHALLENGE_NOT_FOUND' | 'EXPIRED' | 'SUPERSEDED' | 'ALREADY_REDEEMED'

interface PasswordResetRejection {
  reason: PasswordResetRejectionReason
  accountId?: string
  challengeId?: string
  client?: TransactionClientContract
}

@inject()
export default class PasswordResetService {
  constructor(private accessEvents: AccessEventService) {}

  private recordRejectedReset(rejection: PasswordResetRejection, request: RequestAuditContext) {
    const metadata: Record<string, unknown> = { reason: rejection.reason }
    if (rejection.challengeId) {
      metadata.challengeId = rejection.challengeId
    }

    return this.accessEvents.record(
      {
        eventType: 'PASSWORD_RESET_REJECTED',
        actorType: 'SYSTEM',
        targetType: 'USER_ACCOUNT',
        targetId: rejection.accountId,
        request,
        metadata,
      },
      rejection.client
    )
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

      account.passwordResetVersion = Number(account.passwordResetVersion) + 1
      await account.save()

      const challenge = await PasswordResetChallenge.create(
        {
          accountId: account.id,
          resetVersion: account.passwordResetVersion,
          expiresAt: DateTime.now().plus({ hours: 1 }),
          requestIp: request.ip ?? null,
          requestId: request.requestId ?? null,
        },
        { client: trx }
      )

      await this.accessEvents.record(
        {
          eventType: 'PASSWORD_RESET_REQUESTED',
          actorType: 'SYSTEM',
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          request,
          metadata: {
            challengeId: challenge.id,
            resetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return challenge
    })
  }

  createToken(challenge: PasswordResetChallenge) {
    return encryption.encrypt(
      {
        challengeId: challenge.id,
        resetVersion: Number(challenge.resetVersion),
      },
      { expiresIn: '1h', purpose: 'password-reset' }
    )
  }

  async reset(data: ResetPasswordData, request: RequestAuditContext) {
    const payload = encryption.decrypt(data.token, 'password-reset') as PasswordResetToken | null
    if (
      !payload ||
      typeof payload.challengeId !== 'string' ||
      !Number.isInteger(payload.resetVersion)
    ) {
      await this.recordRejectedReset({ reason: 'INVALID_TOKEN' }, request)
      return false
    }

    return db.transaction(async (trx) => {
      const challenge = await PasswordResetChallenge.query({ client: trx })
        .where('id', payload.challengeId)
        .forUpdate()
        .first()
      if (!challenge) {
        await this.recordRejectedReset(
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
        await this.recordRejectedReset(
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

      const redemption = await PasswordResetRedemption.query({ client: trx })
        .where('challenge_id', challenge.id)
        .first()
      if (redemption) {
        await this.recordRejectedReset(
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
        await this.recordRejectedReset(
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

      await this.accessEvents.record(
        {
          eventType: 'PASSWORD_RESET_COMPLETED',
          actorType: 'SYSTEM',
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          request,
          metadata: {
            challengeId: challenge.id,
            credentialVersion: account.credentialVersion,
            passwordResetVersion: account.passwordResetVersion,
          },
        },
        trx
      )

      return true
    })
  }
}
