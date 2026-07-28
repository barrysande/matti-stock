import { hasMany } from '@adonisjs/lucid/orm'
import { PermissionSchema } from '#database/schema'
import RoleVersionPermission from '#models/role_version_permission'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Permission extends PermissionSchema {
  @hasMany(() => RoleVersionPermission, { foreignKey: 'permissionKey' })
  declare roleVersionPermissions: HasMany<typeof RoleVersionPermission>
}
