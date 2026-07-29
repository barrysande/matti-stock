import { Exception } from '@adonisjs/core/exceptions'

export default class AccessAuthorityChangedException extends Exception {
  static status = 403
  static code = 'E_ACCESS_AUTHORITY_CHANGED'
  static message = 'Access administration authority changed before the action completed.'
}
