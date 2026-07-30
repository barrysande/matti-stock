import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidPhysicalLocationChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_PHYSICAL_LOCATION_CHANGE'
  static message = 'The physical location cannot make the requested change.'
}
