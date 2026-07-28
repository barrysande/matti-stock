import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'people'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('display_name', 255).notNullable()
      table.string('staff_number', 100).nullable().unique()
      table.string('primary_email', 254).nullable().unique()
      table.timestamp('primary_email_verified_at', { useTz: true }).nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE people
          ADD CONSTRAINT people_primary_email_normalized
            CHECK (primary_email IS NULL OR primary_email = lower(primary_email))
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
