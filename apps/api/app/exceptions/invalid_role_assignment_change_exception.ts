import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidRoleAssignmentChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_ROLE_ASSIGNMENT_CHANGE'
  static message = 'The role assignment cannot make the requested change.'
}
