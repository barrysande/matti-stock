import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { DelegationAssignmentSchema } from '#database/schema'
import Delegation from '#models/delegation'
import RoleAssignment from '#models/role_assignment'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DelegationAssignment extends DelegationAssignmentSchema {
  @beforeCreate()
  static assignUuid(assignment: DelegationAssignment) {
    assignment.id = randomUUID()
  }

  @belongsTo(() => Delegation)
  declare delegation: BelongsTo<typeof Delegation>
  @belongsTo(() => RoleAssignment, { foreignKey: 'sourceAssignmentId' })
  declare sourceAssignment: BelongsTo<typeof RoleAssignment>
}
