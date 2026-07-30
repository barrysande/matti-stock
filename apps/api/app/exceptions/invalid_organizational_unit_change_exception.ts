import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidOrganizationalUnitChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_ORGANIZATIONAL_UNIT_CHANGE'
  static message = 'The organizational unit cannot make the requested change.'
}
