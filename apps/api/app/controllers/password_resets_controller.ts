import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import PasswordCredentialService from '#services/password_credential_service'
import { forgotPasswordValidator, resetPasswordValidator } from '#validators/session'

const GENERIC_RESET_MESSAGE = 'If an account uses that email, a password reset link will be sent.'

@inject()
export default class PasswordResetsController {
  constructor(private passwordCredentials: PasswordCredentialService) {}

  async request({ request, response, logger }: HttpContext) {
    const payload = await request.validateUsing(forgotPasswordValidator)
    const challenge = await this.passwordCredentials.request(payload, {
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

    return response.ok({ message: GENERIC_RESET_MESSAGE })
  }

  async reset({ request, response }: HttpContext) {
    const payload = await request.validateUsing(resetPasswordValidator)
    const reset = await this.passwordCredentials.reset(payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (!reset) {
      return response.unprocessableEntity({
        code: 'E_INVALID_PASSWORD_RESET',
        message: 'This password reset link is invalid or has expired.',
      })
    }

    return response.ok({
      message: 'Password reset successfully. Sign in with the new password.',
    })
  }
}
