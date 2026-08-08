import Role from '#models/role'
import RoleVersion from '#models/role_version'
import type { roleHistoryValidator } from '#validators/role'
import type { Infer } from '@vinejs/vine/types'

const VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof roleHistoryValidator>

export default class RoleVersionDirectoryService {
  /** Returns one reverse-chronological page of immutable role versions. */
  async list(roleId: string, data: HistoryData) {
    await Role.findOrFail(roleId)

    return RoleVersion.query()
      .where('role_id', roleId)
      .preload('permissions', (membershipQuery) => {
        membershipQuery.orderBy('permission_key', 'asc')
      })
      .preload('createdByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
      .withCount('assignments')
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, VERSIONS_PER_PAGE)
  }
}
