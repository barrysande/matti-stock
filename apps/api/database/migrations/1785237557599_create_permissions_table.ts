import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('key', 100).primary()
      table.string('description', 500).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE permissions
          ADD CONSTRAINT permissions_key_normalized
            CHECK (key = lower(key))
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
