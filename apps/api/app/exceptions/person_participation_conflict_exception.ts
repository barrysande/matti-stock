import { Exception } from '@adonisjs/core/exceptions'

export default class PersonParticipationConflictException extends Exception {
  static status = 409
  static code = 'E_PERSON_PARTICIPATION_CONFLICT'
  static message = 'Independent participation requires a different person.'
}
