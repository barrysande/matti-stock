import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import { DelegationSchema } from '#database/schema'
import DelegationAssignment from '#models/delegation_assignment'
import DelegationResponse from '#models/delegation_response'
import DelegationTermination from '#models/delegation_termination'
import UserAccount from '#models/user_account'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class Delegation extends DelegationSchema {
  @beforeCreate()
  static assignUuid(delegation: Delegation) {
    delegation.id = randomUUID()
  }

  @belongsTo(() => UserAccount, { foreignKey: 'delegatorAccountId' })
  declare delegator: BelongsTo<typeof UserAccount>

  @belongsTo(() => UserAccount, { foreignKey: 'delegateAccountId' })
  declare delegate: BelongsTo<typeof UserAccount>

  @hasMany(() => DelegationAssignment)
  declare assignments: HasMany<typeof DelegationAssignment>

  @hasOne(() => DelegationResponse)
  declare response: HasOne<typeof DelegationResponse>

  @hasOne(() => DelegationTermination)
  declare termination: HasOne<typeof DelegationTermination>
}
