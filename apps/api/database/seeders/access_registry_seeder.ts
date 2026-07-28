import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import Permission from '#models/permission'
import Role from '#models/role'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'

export default class extends BaseSeeder {
  async run() {
    await db.transaction(async (trx) => {
      const permission = await Permission.create(
        {
          key: 'access.root',
          description: 'Administer identity, access, and organizational authority',
        },
        { client: trx }
      )
      const role = await Role.create(
        {
          key: 'MASTER_ADMIN',
          name: 'Master Admin',
          systemManaged: true,
        },
        { client: trx }
      )
      const version = await RoleVersion.create(
        {
          roleId: role.id,
          version: 1,
          reason: 'Initial deployment access root',
          createdByAccountId: null,
        },
        { client: trx }
      )

      await RoleVersionPermission.create(
        {
          roleVersionId: version.id,
          permissionKey: permission.key,
        },
        { client: trx }
      )
    })
  }
}
