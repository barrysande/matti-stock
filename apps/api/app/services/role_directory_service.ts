import Role from '#models/role'
import type { indexRolesValidator, roleOptionsValidator } from '#validators/role'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexRolesValidator>
type OptionData = Infer<typeof roleOptionsValidator>
const ROLES_PER_PAGE = 20

export default class RoleDirectoryService {
  private summaryQuery() {
    return Role.query()
      .withCount('assignments')
      .preload('versions', (versionQuery) => {
        versionQuery
          .select('id', 'role_id', 'version')
          .preload('permissions', (membershipQuery) => {
            membershipQuery
              .select('role_version_id', 'permission_key')
              .orderBy('permission_key', 'asc')
          })
          .withCount('assignments')
          .orderBy('version', 'desc')
          .groupLimit(1)
      })
  }

  private detailQuery() {
    return this.summaryQuery()
  }

  private filteredQuery(data: OptionData) {
    const query = this.summaryQuery().orderBy('name', 'asc').orderBy('id', 'asc')

    if (!data.includeArchived) {
      query.whereNull('archived_at')
    }

    if (data.search) {
      query.where((builder) => {
        builder.whereILike('name', `%${data.search}%`).orWhereILike('key', `%${data.search}%`)
      })
    }

    if (data.systemManaged !== undefined) {
      query.where('system_managed', data.systemManaged)
    }

    return query
  }

  /** Returns one fixed directory page of reusable roles. */
  paginate(data: ListData) {
    return this.filteredQuery(data).paginate(data.page ?? 1, ROLES_PER_PAGE)
  }

  /** Lists all roles required for complete role selectors. */
  listOptions(data: OptionData) {
    return this.filteredQuery(data)
  }

  /** Loads one role with its current permission version and assignment usage counts. */
  findDetails(roleId: string) {
    return this.detailQuery().where('id', roleId).firstOrFail()
  }
}
