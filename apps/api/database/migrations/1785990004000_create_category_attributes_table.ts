import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'category_attributes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_category_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.string('data_type', 32).notNullable()
      table.boolean('is_required').notNullable()
      table.string('scope', 32).notNullable()
      table.timestamp('semantics_locked_at', { useTz: true }).nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['catalogue_category_id'])
      table.index(['scope', 'archived_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE category_attributes
          ADD CONSTRAINT category_attributes_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT category_attributes_description_present
            CHECK (description IS NULL OR btrim(description) <> ''),
          ADD CONSTRAINT category_attributes_data_type_valid
            CHECK (data_type IN ('TEXT', 'NUMBER', 'DATE', 'YES_NO', 'PREDEFINED_CHOICE')),
          ADD CONSTRAINT category_attributes_scope_valid
            CHECK (scope IN ('CATALOGUE', 'INVENTORY_UNIT'))
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX category_attributes_active_category_name_unique
          ON category_attributes (catalogue_category_id, lower(name))
          WHERE archived_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
