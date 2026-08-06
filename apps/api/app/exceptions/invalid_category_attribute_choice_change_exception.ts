import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidCategoryAttributeChoiceChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_CATEGORY_ATTRIBUTE_CHOICE_CHANGE'
}
