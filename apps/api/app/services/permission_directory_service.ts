import Permission from '#models/permission'

export default class PermissionDirectoryService {
  /** Lists the stable software-defined permission vocabulary in key order. */
  list() {
    return Permission.query().orderBy('key', 'asc')
  }
}
