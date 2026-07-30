import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { RoleAssignmentTerminationSchema } from '#database/schema'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RoleAssignmentTermination extends RoleAssignmentTerminationSchema {
  @beforeCreate()
  static assignUuid(termination: RoleAssignmentTermination) {
    termination.id = randomUUID()
  }

  @belongsTo(() => RoleAssignment, { foreignKey: 'assignmentId' })
  declare assignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => RoleAssignment, { foreignKey: 'replacementAssignmentId' })
  declare replacementAssignment: BelongsTo<typeof RoleAssignment>

  @belongsTo(() => UserAccount, { foreignKey: 'terminatedByAccountId' })
  declare terminatedByAccount: BelongsTo<typeof UserAccount>
}
