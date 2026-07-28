import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.text('reason').notNullable()
      table
        .uuid('created_by_account_id')
        .nullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['role_id', 'version'])
      table.index(['created_by_account_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE role_versions
          ADD CONSTRAINT role_versions_version_positive
            CHECK (version > 0)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
