import { inject } from '@adonisjs/core'
import { Logger } from '@adonisjs/core/logger'
import { Job } from '@adonisjs/queue'
import type { JobOptions } from '@adonisjs/queue/types'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import env from '#start/env'
import PasswordResetChallenge from '#models/password_reset_challenge'
import UserAccount from '#models/user_account'
import Person from '#models/person'
import PasswordResetService from '#services/password_reset_service'
import PasswordResetMail from '#mails/password_reset_mail'

interface Payload {
  challengeId: string
}

@inject()
export default class SendPasswordResetEmail extends Job<Payload> {
  static options: JobOptions = {
    queue: 'emails',
  }

  constructor(
    private passwordResets: PasswordResetService,
    private logger: Logger
  ) {
    super()
  }

  async execute() {
    const challenge = await PasswordResetChallenge.find(this.payload.challengeId)
    if (!challenge || challenge.expiresAt <= DateTime.now()) {
      return
    }

    const account = await UserAccount.findOrFail(challenge.accountId)
    if (Number(account.passwordResetVersion) !== Number(challenge.resetVersion)) {
      return
    }

    const person = await Person.findOrFail(account.personId)
    const token = this.passwordResets.createToken(challenge)
    const resetUrl = new URL('/reset-password', env.get('WEB_URL'))
    resetUrl.searchParams.set('token', token)

    await mail.send(
      new PasswordResetMail({ name: person.displayName, email: account.email }, resetUrl.toString())
    )
  }

  async failed(error: Error) {
    this.logger.error(
      { err: error, challengeId: this.payload.challengeId },
      'Password reset email job permanently failed'
    )
  }
}
