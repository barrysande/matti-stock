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
import PasswordCredentialService from '#services/password_credential_service'

interface Payload {
  challengeId: string
}

@inject()
export default class SendPasswordCredentialEmail extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
  }

  constructor(
    private passwordCredentials: PasswordCredentialService,
    private logger: Logger
  ) {
    super()
  }

  async execute() {
    const challenge = await PasswordResetChallenge.find(this.payload.challengeId)
    if (!challenge || challenge.expiresAt <= DateTime.now()) {
      return
    }

    const redemption = await PasswordResetRedemption.find(challenge.id)
    if (redemption) {
      return
    }

    const account = await UserAccount.findOrFail(challenge.accountId)
    if (Number(account.passwordResetVersion) !== Number(challenge.resetVersion)) {
      return
    }

    const person = await Person.findOrFail(account.personId)
    const token = this.passwordCredentials.createToken(challenge)

    if (challenge.purpose === 'INITIAL_SETUP') {
      if (person.primaryEmailVerifiedAt) {
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
      return
    }

    if (!person.primaryEmailVerifiedAt) {
      return
    }

    const resetUrl = new URL('/reset-password', env.get('WEB_URL'))
    resetUrl.searchParams.set('token', token)
    await mail.send(
      new PasswordResetMail({ name: person.displayName, email: account.email }, resetUrl.toString())
    )
  }

  async failed(error: Error) {
    this.logger.error(
      { err: error, challengeId: this.payload.challengeId },
      'Password credential email job permanently failed'
    )
  }
}
