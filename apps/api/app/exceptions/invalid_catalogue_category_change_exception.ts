import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidCatalogueCategoryChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_CATALOGUE_CATEGORY_CHANGE'
}
