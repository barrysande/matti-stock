import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { DelegationTerminationSchema } from '#database/schema'
import Delegation from '#models/delegation'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DelegationTermination extends DelegationTerminationSchema {
  @beforeCreate()
  static assignUuid(termination: DelegationTermination) {
    termination.id = randomUUID()
  }

  @belongsTo(() => Delegation)
  declare delegation: BelongsTo<typeof Delegation>

  @belongsTo(() => UserAccount, { foreignKey: 'terminatedByAccountId' })
  declare terminatedBy: BelongsTo<typeof UserAccount>
}
