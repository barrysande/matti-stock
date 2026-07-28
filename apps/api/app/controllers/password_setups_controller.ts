import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PasswordCredentialService from '#services/password_credential_service'
import { setPasswordValidator } from '#validators/session'

@inject()
export default class PasswordSetupsController {
  constructor(private passwordCredentials: PasswordCredentialService) {}

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(setPasswordValidator)
    const set = await this.passwordCredentials.setup(payload, {
      ip: request.ip(),
      requestId: request.id(),
    })

    if (!set) {
      return response.unprocessableEntity({
        code: 'E_INVALID_PASSWORD_SETUP',
        message: 'This password-setting link is invalid or has expired.',
      })
    }

    return response.ok({
      message: 'Password set successfully. Sign in with your new password.',
    })
  }
}
