import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'physical_location_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('physical_location_id')
        .notNullable()
        .references('id')
        .inTable('physical_locations')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('name', 255).notNullable()
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable('physical_locations')
        .onDelete('RESTRICT')
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('effective_from', { useTz: true }).notNullable()
      table.timestamp('effective_to', { useTz: true }).nullable()
      table
        .uuid('changed_by_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['physical_location_id', 'version'])
      table.index(['physical_location_id', 'effective_to'])
      table.index(['parent_id'])
      table.index(['changed_by_account_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE physical_location_versions
          ADD CONSTRAINT physical_location_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT physical_location_versions_parent_valid
            CHECK (parent_id IS NULL OR parent_id <> physical_location_id)
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX physical_location_versions_one_current
          ON physical_location_versions (physical_location_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
