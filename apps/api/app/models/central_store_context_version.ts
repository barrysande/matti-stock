import { randomUUID } from 'node:crypto'
import { beforeCreate, belongsTo } from '@adonisjs/lucid/orm'
import { CentralStoreContextVersionSchema } from '#database/schema'
import OrganizationalUnit from '#models/organizational_unit'
import PhysicalLocation from '#models/physical_location'
import UserAccount from '#models/user_account'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class CentralStoreContextVersion extends CentralStoreContextVersionSchema {
  @beforeCreate()
  static assignUuid(context: CentralStoreContextVersion) {
    context.id = randomUUID()
  }

  @belongsTo(() => OrganizationalUnit, { foreignKey: 'custodialOrganizationalUnitId' })
  declare custodialOrganizationalUnit: BelongsTo<typeof OrganizationalUnit>

  @belongsTo(() => PhysicalLocation)
  declare physicalLocation: BelongsTo<typeof PhysicalLocation>

  @belongsTo(() => UserAccount, { foreignKey: 'configuredByAccountId' })
  declare configuredByAccount: BelongsTo<typeof UserAccount>
}
