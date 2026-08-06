import { Exception } from '@adonisjs/core/exceptions'

export default class CatalogueItemSemanticsLockedException extends Exception {
  static status = 409
  static code = 'E_CATALOGUE_ITEM_SEMANTICS_LOCKED'
}
