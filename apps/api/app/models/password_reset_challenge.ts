import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo, hasOne } from '@adonisjs/lucid/orm'
import { PasswordResetChallengeSchema } from '#database/schema'
import PasswordResetRedemption from '#models/password_reset_redemption'
import UserAccount from '#models/user_account'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'

export default class PasswordResetChallenge extends PasswordResetChallengeSchema {
  @beforeCreate()
  static assignUuid(challenge: PasswordResetChallenge) {
    challenge.id = randomUUID()
  }

  @belongsTo(() => UserAccount)
  declare account: BelongsTo<typeof UserAccount>

  @hasOne(() => PasswordResetRedemption, { foreignKey: 'challengeId' })
  declare redemption: HasOne<typeof PasswordResetRedemption>
}
