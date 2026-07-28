import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('key', 100).notNullable().unique()
      table.string('name', 255).notNullable()
      table.boolean('system_managed').notNullable().defaultTo(false)
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE roles
          ADD CONSTRAINT roles_key_normalized
            CHECK (key = upper(key))
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
