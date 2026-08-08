import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidCentralStoreContextChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_CENTRAL_STORE_CONTEXT_CHANGE'
  static message = 'The Central Store context cannot make the requested change.'
}
