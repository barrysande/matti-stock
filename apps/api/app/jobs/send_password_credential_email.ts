import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import env from '#start/env'
import AccountPasswordSetupMail from '#mails/account_password_setup_mail'
import PasswordResetMail from '#mails/password_reset_mail'
import PasswordResetChallenge from '#models/password_reset_challenge'
import PasswordResetRedemption from '#models/password_reset_redemption'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import PasswordChallengeService from '#services/password_challenge_service'

interface Payload {
  challengeId: string
}

@inject()
export default class SendPasswordCredentialEmail extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
  }

  constructor(
    private passwordChallenges: PasswordChallengeService,
    private logger: Logger
  ) {
    super()
  }

  async execute() {
    this.logger.info('Processing password credential email job')
    const challenge = await PasswordResetChallenge.find(this.payload.challengeId)
    if (!challenge || challenge.expiresAt <= DateTime.now()) {
      this.logger.info('Skipped unavailable or expired password credential email job')
      return
    }

    const redemption = await PasswordResetRedemption.find(challenge.id)
    if (redemption) {
      this.logger.info('Skipped redeemed password credential email job')
      return
    }

    const account = await UserAccount.findOrFail(challenge.accountId)
    if (Number(account.passwordResetVersion) !== Number(challenge.resetVersion)) {
      this.logger.info('Skipped superseded password credential email job')
      return
    }

    const person = await Person.findOrFail(account.personId)
    const token = this.passwordChallenges.createToken(challenge)

    if (challenge.purpose === 'INITIAL_SETUP') {
      if (person.primaryEmailVerifiedAt) {
        this.logger.info('Skipped password setup email for an already verified person')
        return
      }

      const setupUrl = new URL('/set-password', env.get('WEB_URL'))
      setupUrl.searchParams.set('token', token)
      await mail.send(
        new AccountPasswordSetupMail(
          { name: person.displayName, email: account.email },
          setupUrl.toString()
        )
      )
      this.logger.info('Password setup email sent')
      return
    }

    if (!person.primaryEmailVerifiedAt) {
      this.logger.info('Skipped password reset email for an unverified person')
      return
    }

    const resetUrl = new URL('/reset-password', env.get('WEB_URL'))
    resetUrl.searchParams.set('token', token)
    await mail.send(
      new PasswordResetMail({ name: person.displayName, email: account.email }, resetUrl.toString())
    )
    this.logger.info('Password reset email sent')
  }

  async failed(error: Error) {
    this.logger.error({ err: error }, 'Password credential email job permanently failed')
  }
}
