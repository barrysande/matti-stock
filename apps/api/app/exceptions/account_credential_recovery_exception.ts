import { Exception } from '@adonisjs/core/exceptions'

export default class AccountCredentialRecoveryException extends Exception {
  static status = 409
  static code = 'E_ACCOUNT_CREDENTIAL_RECOVERY_UNAVAILABLE'
  static message = 'This account cannot currently sign in. Contact administrator.'
}
