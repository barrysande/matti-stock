import { belongsTo } from '@adonisjs/lucid/orm'
import { PasswordResetRedemptionSchema } from '#database/schema'
import PasswordResetChallenge from '#models/password_reset_challenge'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class PasswordResetRedemption extends PasswordResetRedemptionSchema {
  @belongsTo(() => PasswordResetChallenge, { foreignKey: 'challengeId' })
  declare challenge: BelongsTo<typeof PasswordResetChallenge>

  @belongsTo(() => UserAccount)
  declare account: BelongsTo<typeof UserAccount>
}
