import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('permissions', (table) => {
      table.boolean('custom_role_assignable').nullable()
    })
    this.schema.alterTable('roles', (table) => {
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        UPDATE permissions
        SET custom_role_assignable = (key <> 'access.root')
      `)
      await db.rawQuery(`
        ALTER TABLE permissions
          ALTER COLUMN custom_role_assignable SET NOT NULL,
          ALTER COLUMN custom_role_assignable SET DEFAULT true
      `)
      await db.rawQuery(`
        ALTER TABLE permissions
          ADD CONSTRAINT permissions_access_root_reserved
            CHECK (key <> 'access.root' OR custom_role_assignable = false)
      `)
      await db.rawQuery(`
        UPDATE roles
        SET updated_at = created_at
      `)
      await db.rawQuery(`
        ALTER TABLE roles
          ALTER COLUMN updated_at SET NOT NULL
      `)
      await db.rawQuery(`
        CREATE UNIQUE INDEX roles_active_name_unique
          ON roles (lower(name))
          WHERE archived_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.raw('DROP INDEX IF EXISTS roles_active_name_unique')
    this.schema.raw(
      'ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_access_root_reserved'
    )
    this.schema.alterTable('roles', (table) => {
      table.dropColumn('updated_at')
    })
    this.schema.alterTable('permissions', (table) => {
      table.dropColumn('custom_role_assignable')
    })
  }
}
