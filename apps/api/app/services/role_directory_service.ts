import Role from '#models/role'
import type { indexRolesValidator } from '#validators/role'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexRolesValidator>

export default class RoleDirectoryService {
  private summaryQuery() {
    return Role.query().preload('versions', (versionQuery) => {
      versionQuery
        .select('id', 'role_id', 'version')
        .preload('permissions', (membershipQuery) => {
          membershipQuery
            .select('role_version_id', 'permission_key')
            .orderBy('permission_key', 'asc')
        })
        .withCount('assignments')
        .orderBy('version', 'desc')
    })
  }

  private detailQuery() {
    return Role.query().preload('versions', (versionQuery) => {
      versionQuery
        .preload('permissions', (membershipQuery) => {
          membershipQuery.orderBy('permission_key', 'asc')
        })
        .preload('createdByAccount', (accountQuery) => {
          accountQuery.preload('person')
        })
        .withCount('assignments')
        .orderBy('version', 'desc')
    })
  }

  /** Lists reusable roles with their current immutable permission version and assignment counts. */
  list(data: ListData) {
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

  /** Loads one role with complete permission-version history and assignment usage counts. */
  overview(roleId: string) {
    return this.detailQuery().where('id', roleId).firstOrFail()
  }
}
