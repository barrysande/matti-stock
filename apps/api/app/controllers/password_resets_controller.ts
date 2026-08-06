import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import PasswordChallengeService from '#services/password_challenge_service'
import PasswordCredentialService from '#services/password_credential_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/session'

@inject()
export default class PasswordResetsController {
  constructor(
    private passwordChallenges: PasswordChallengeService,
    private passwordCredentials: PasswordCredentialService
  ) {}

  async request({ logger, request, response }: HttpContext) {
    const payload = await request.validateUsing(forgotPasswordValidator)

    const challenge = await this.passwordChallenges.request(payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (challenge) {
      try {
        await SendPasswordCredentialEmail.dispatch({ challengeId: challenge.id })
      } catch (error) {
        logger.error(
          { err: error, challengeId: challenge.id },
          'Failed to enqueue a password credential email'
        )
      }
    }

    return response.ok({
      message: 'If an account uses that email, a password reset link will be sent.',
    })
  }

  async reset({ request, response }: HttpContext) {
    const payload = await request.validateUsing(resetPasswordValidator)

    const reset = await this.passwordCredentials.reset(payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (reset.kind === 'INVALID') {
      return response.unprocessableEntity({
        code: 'E_INVALID_PASSWORD_RESET',
        message: 'This password reset link is invalid or has expired.',
      })
    }

    if (reset.kind === 'ACCOUNT_SIGN_IN_UNAVAILABLE') {
      return response.conflict({
        code: 'E_ACCOUNT_SIGN_IN_UNAVAILABLE',
        message: 'This account cannot currently sign in. Contact administrator.',
      })
    }

    return response.ok({
      message: 'Password reset successfully. Sign in with the new password.',
    })
  }
}
