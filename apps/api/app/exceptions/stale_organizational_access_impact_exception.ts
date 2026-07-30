import { Exception } from '@adonisjs/core/exceptions'

export default class StaleOrganizationalAccessImpactException extends Exception {
  static status = 409
  static code = 'E_STALE_ORGANIZATIONAL_ACCESS_IMPACT'
  static message =
    'Organizational access has changed since the preview. Review the access impact again.'
}
