import Role from '#models/role'
import RoleVersion from '#models/role_version'
import type { indexRolesValidator, roleOptionsValidator } from '#validators/role'
import type { Infer } from '@vinejs/vine/types'

type ListData = Infer<typeof indexRolesValidator>
type OptionData = Infer<typeof roleOptionsValidator>
const ROLES_PER_PAGE = 20

export default class RoleDirectoryService {
  private summaryQuery() {
    return Role.query().withCount('assignments')
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

  private async loadCurrentVersions(roles: Role[]) {
    if (roles.length === 0) return

    const versions = await RoleVersion.query()
      .whereIn(
        'role_id',
        roles.map(({ id }) => id)
      )
      .select('id', 'role_id', 'version')
      .distinctOn('role_id')
      .preload('permissions', (membershipQuery) => {
        membershipQuery.select('role_version_id', 'permission_key').orderBy('permission_key', 'asc')
      })
      .withCount('assignments')
      .orderBy('role_id', 'asc')
      .orderBy('version', 'desc')

    const versionsByRole = new Map(versions.map((version) => [version.roleId, version]))

    for (const role of roles) {
      role.$extras.currentVersion = versionsByRole.get(role.id) ?? null
    }
  }

  /** Returns one fixed directory page of reusable roles. */
  async paginate(data: ListData) {
    const roles = await this.filteredQuery(data).paginate(data.page ?? 1, ROLES_PER_PAGE)

    await this.loadCurrentVersions(roles.all())

    return roles
  }

  /** Lists all roles required for complete role selectors. */
  async listOptions(data: OptionData) {
    const roles = await this.filteredQuery(data)

    await this.loadCurrentVersions(roles)

    return roles
  }

  /** Loads one role with its current permission version and assignment usage counts. */
  async findDetails(roleId: string) {
    const role = await this.detailQuery().where('id', roleId).firstOrFail()

    await this.loadCurrentVersions([role])

    return role
  }
}
