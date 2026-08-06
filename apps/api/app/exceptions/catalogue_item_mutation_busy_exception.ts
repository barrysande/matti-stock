import { Exception } from '@adonisjs/core/exceptions'

export default class CatalogueItemMutationBusyException extends Exception {
  static status = 409
  static code = 'E_CATALOGUE_ITEM_MUTATION_BUSY'
}
