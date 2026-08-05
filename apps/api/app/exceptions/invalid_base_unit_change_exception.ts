import { Exception } from '@adonisjs/core/exceptions'

export default class InvalidBaseUnitChangeException extends Exception {
  static status = 409
  static code = 'E_INVALID_BASE_UNIT_CHANGE'
}
