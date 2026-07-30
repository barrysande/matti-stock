import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidDelegationChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_DELEGATION_CHANGE'
  static message = 'The delegation cannot make the requested change.'
}
