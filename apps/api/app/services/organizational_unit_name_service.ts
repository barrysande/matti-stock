import InvalidOrganizationalUnitChangeException from '#exceptions/invalid_organizational_unit_change_exception'

const DESCENDANT_SUFFIX = /^(.*)\s+(?:department|sub(?:-|\s)?department)$/i
const DESCENDANT_TYPE_NAME = /^(?:department|sub(?:-|\s)?department)$/i

export default class OrganizationalUnitNameService {
  normalize(name: string, unitType: string) {
    if (unitType === 'INSTITUTE') {
      return name
    }

    let normalized = name.replace(/\s+/g, ' ').trim()

    while (DESCENDANT_SUFFIX.test(normalized)) {
      normalized = normalized.replace(DESCENDANT_SUFFIX, '$1').trim()
    }

    if (!normalized || DESCENDANT_TYPE_NAME.test(normalized)) {
      throw new InvalidOrganizationalUnitChangeException(
        'Enter the organizational unit name without Department or Sub-department.'
      )
    }

    return normalized
  }
}
