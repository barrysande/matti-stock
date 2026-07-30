import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidRoleChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_ROLE_CHANGE'
  static message = 'The role cannot make the requested change.'
}
