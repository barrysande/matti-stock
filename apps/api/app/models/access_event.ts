import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { AccessEventSchema } from '#database/schema'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class AccessEvent extends AccessEventSchema {
  @beforeCreate()
  static assignUuid(event: AccessEvent) {
    event.id = randomUUID()
  }

  @belongsTo(() => UserAccount, { foreignKey: 'actorAccountId' })
  declare actorAccount: BelongsTo<typeof UserAccount>
}
