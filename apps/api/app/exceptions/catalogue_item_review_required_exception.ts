import { Exception } from '@adonisjs/core/exceptions'

export default class CatalogueItemReviewRequiredException extends Exception {
  static status = 409
  static code = 'E_CATALOGUE_ITEM_REVIEW_REQUIRED'
}
