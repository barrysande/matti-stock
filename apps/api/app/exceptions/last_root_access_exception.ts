import { Exception } from '@adonisjs/core/exceptions'

export default class LastRootAccessException extends Exception {
  static status = 409
  static code = 'E_LAST_ROOT_ACCESS'
  static message = 'This action would leave the system without effective root access.'
}
