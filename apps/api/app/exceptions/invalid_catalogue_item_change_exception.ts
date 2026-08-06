import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidCatalogueItemChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_CATALOGUE_ITEM_CHANGE'
}
