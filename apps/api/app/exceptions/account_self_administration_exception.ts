import { Exception } from '@adonisjs/core/exceptions'

export default class AccountSelfAdministrationException extends Exception {
  static status = 409
  static code = 'E_ACCOUNT_SELF_ADMINISTRATION'
  static message = 'You cannot suspend or deactivate your own account.'
}
