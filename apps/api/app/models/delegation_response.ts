import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { DelegationResponseSchema } from '#database/schema'
import Delegation from '#models/delegation'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class DelegationResponse extends DelegationResponseSchema {
  @beforeCreate()
  static assignUuid(response: DelegationResponse) {
    response.id = randomUUID()
  }

  @belongsTo(() => Delegation)
  declare delegation: BelongsTo<typeof Delegation>
  @belongsTo(() => UserAccount, { foreignKey: 'respondedByAccountId' })
  declare respondedBy: BelongsTo<typeof UserAccount>
}
