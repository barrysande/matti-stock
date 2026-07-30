import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasOne } from '@adonisjs/lucid/orm'
import { RoleAssignmentSchema } from '#database/schema'
import OrganizationalUnit from '#models/organizational_unit'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import RoleVersion from '#models/role_version'
import UserAccount from '#models/user_account'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

export default class RoleAssignment extends RoleAssignmentSchema {
  @beforeCreate()
  static assignUuid(assignment: RoleAssignment) {
    assignment.id = randomUUID()
  }

  @belongsTo(() => UserAccount, { foreignKey: 'accountId' })
  declare account: BelongsTo<typeof UserAccount>

  @belongsTo(() => RoleVersion)
  declare roleVersion: BelongsTo<typeof RoleVersion>

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'scopeOrgUnitId' })
  declare scopeOrgUnit: BelongsTo<typeof OrganizationalUnit>

  @belongsTo(() => UserAccount, { foreignKey: 'grantedByAccountId' })
  declare grantedByAccount: BelongsTo<typeof UserAccount>

  @hasOne(() => RoleAssignmentTermination, { foreignKey: 'assignmentId' })
  declare termination: HasOne<typeof RoleAssignmentTermination>
}
