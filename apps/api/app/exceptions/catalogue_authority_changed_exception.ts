import { Exception } from '@adonisjs/core/exceptions'

export default class CatalogueAuthorityChangedException extends Exception {
  static status = 403
  static code = 'E_CATALOGUE_AUTHORITY_CHANGED'
  static message = 'Catalogue authority changed before the action completed.'
}
