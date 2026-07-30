import { randomUUID } from 'node:crypto'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { beforeCreate, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { UserAccountSchema } from '#database/schema'
import AccessEvent from '#models/access_event'
import Delegation from '#models/delegation'
import DelegationResponse from '#models/delegation_response'
import DelegationTermination from '#models/delegation_termination'
import PasswordResetChallenge from '#models/password_reset_challenge'
import PasswordResetRedemption from '#models/password_reset_redemption'
import Person from '#models/person'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

const AuthFinder = withAuthFinder(() => hash.use('argon'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class UserAccount extends compose(UserAccountSchema, AuthFinder) {
  @beforeCreate()
  static assignUuid(account: UserAccount) {
    account.id = randomUUID()
  }

  @belongsTo(() => Person)
  declare person: BelongsTo<typeof Person>

  @hasMany(() => RoleAssignment, { foreignKey: 'accountId' })
  declare roleAssignments: HasMany<typeof RoleAssignment>

  @hasMany(() => RoleAssignment, { foreignKey: 'grantedByAccountId' })
  declare grantedRoleAssignments: HasMany<typeof RoleAssignment>

  @hasMany(() => Delegation, { foreignKey: 'delegatorAccountId' })
  declare proposedDelegations: HasMany<typeof Delegation>

  @hasMany(() => Delegation, { foreignKey: 'delegateAccountId' })
  declare receivedDelegations: HasMany<typeof Delegation>

  @hasMany(() => DelegationResponse, { foreignKey: 'respondedByAccountId' })
  declare delegationResponses: HasMany<typeof DelegationResponse>

  @hasMany(() => DelegationTermination, { foreignKey: 'terminatedByAccountId' })
  declare delegationTerminations: HasMany<typeof DelegationTermination>

  @hasMany(() => RoleVersion, { foreignKey: 'createdByAccountId' })
  declare createdRoleVersions: HasMany<typeof RoleVersion>

  @hasMany(() => AccessEvent, { foreignKey: 'actorAccountId' })
  declare accessEvents: HasMany<typeof AccessEvent>

  @hasMany(() => PasswordResetChallenge, { foreignKey: 'accountId' })
  declare passwordResetChallenges: HasMany<typeof PasswordResetChallenge>

  @hasMany(() => PasswordResetRedemption, { foreignKey: 'accountId' })
  declare passwordResetRedemptions: HasMany<typeof PasswordResetRedemption>
}
