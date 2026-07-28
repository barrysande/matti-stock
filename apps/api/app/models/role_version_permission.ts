import { belongsTo } from '@adonisjs/lucid/orm'
import { RoleVersionPermissionSchema } from '#database/schema'
import Permission from '#models/permission'
import RoleVersion from '#models/role_version'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class RoleVersionPermission extends RoleVersionPermissionSchema {
  @belongsTo(() => RoleVersion)
  declare roleVersion: BelongsTo<typeof RoleVersion>

  @belongsTo(() => Permission, { foreignKey: 'permissionKey' })
  declare permission: BelongsTo<typeof Permission>
}
