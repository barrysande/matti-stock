import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidAccountTransitionException extends Exception {
  static status = 409
  static code = 'E_INVALID_ACCOUNT_TRANSITION'
  static message = 'The account cannot make the requested status transition.'
}
