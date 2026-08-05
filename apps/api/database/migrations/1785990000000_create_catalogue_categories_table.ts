import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_categories'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 255).notNullable()
      table.text('description').notNullable()
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable(this.tableName)
        .onDelete('RESTRICT')
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['parent_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_categories
          ADD CONSTRAINT catalogue_categories_parent_valid
            CHECK (parent_id IS NULL OR parent_id <> id),
          ADD CONSTRAINT catalogue_categories_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT catalogue_categories_description_present
            CHECK (btrim(description) <> '')
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_active_top_level_name_unique
          ON catalogue_categories (lower(name))
          WHERE archived_at IS NULL AND parent_id IS NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_categories_active_sibling_name_unique
          ON catalogue_categories (parent_id, lower(name))
          WHERE archived_at IS NULL AND parent_id IS NOT NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
