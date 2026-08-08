import { Exception } from '@adonisjs/core/exceptions'

export default class CentralStoreAuthorityChangedException extends Exception {
  static status = 403
  static code = 'E_CENTRAL_STORE_AUTHORITY_CHANGED'

  constructor(message: string) {
    super(message)
  }
}
