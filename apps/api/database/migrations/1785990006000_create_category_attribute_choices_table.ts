import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'category_attribute_choices'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('category_attribute_id')
        .notNullable()
        .references('id')
        .inTable('category_attributes')
        .onDelete('RESTRICT')
      table.string('label', 255).notNullable()
      table.integer('display_order').nullable()
      table.timestamp('first_used_at', { useTz: true }).nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['category_attribute_id'])
      table.index(['category_attribute_id', 'archived_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE category_attribute_choices
          ADD CONSTRAINT category_attribute_choices_label_present
            CHECK (btrim(label) <> ''),
          ADD CONSTRAINT category_attribute_choices_active_order_valid
            CHECK (
              (archived_at IS NULL AND display_order IS NOT NULL AND display_order > 0)
              OR
              (archived_at IS NOT NULL AND display_order IS NULL)
            )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX category_attribute_choices_active_label_unique
          ON category_attribute_choices (category_attribute_id, lower(label))
          WHERE archived_at IS NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX category_attribute_choices_active_order_unique
          ON category_attribute_choices (category_attribute_id, display_order)
          WHERE archived_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
