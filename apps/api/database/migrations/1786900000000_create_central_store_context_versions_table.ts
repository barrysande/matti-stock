import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'central_store_context_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.integer('version').notNullable().unique()
      table
        .uuid('custodial_organizational_unit_id')
        .notNullable()
        .references('id')
        .inTable('organizational_units')
        .onDelete('RESTRICT')
      table
        .uuid('physical_location_id')
        .notNullable()
        .references('id')
        .inTable('physical_locations')
        .onDelete('RESTRICT')
      table
        .uuid('configured_by_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('effective_from', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['custodial_organizational_unit_id'])
      table.index(['physical_location_id'])
      table.index(['configured_by_account_id'])
      table.index(['effective_from'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE central_store_context_versions
          ADD CONSTRAINT central_store_context_versions_version_positive
            CHECK (version > 0),
          ADD CONSTRAINT central_store_context_versions_reason_present
            CHECK (length(btrim(reason)) > 0)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
