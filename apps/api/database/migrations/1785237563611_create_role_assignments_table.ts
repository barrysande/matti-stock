import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table
        .uuid('role_version_id')
        .notNullable()
        .references('id')
        .inTable('role_versions')
        .onDelete('RESTRICT')
      table
        .uuid('scope_org_unit_id')
        .notNullable()
        .references('id')
        .inTable('organizational_units')
        .onDelete('RESTRICT')
      table
        .string('scope_mode', 32)
        .notNullable()
        .checkIn(['THIS_NODE_ONLY', 'INCLUDE_DESCENDANTS'])
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).nullable()
      table
        .uuid('granted_by_account_id')
        .nullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['account_id'])
      table.index(['role_version_id'])
      table.index(['scope_org_unit_id'])
      table.index(['granted_by_account_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE role_assignments
          ADD CONSTRAINT role_assignments_time_range_valid
            CHECK (expires_at IS NULL OR starts_at < expires_at)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
