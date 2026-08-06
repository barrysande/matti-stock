import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidCatalogueCategoryMergeException extends Exception {
  static status = 409
  static code = 'E_INVALID_CATALOGUE_CATEGORY_MERGE'
}
