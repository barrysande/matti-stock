import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_item_keywords'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_item_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_items')
        .onDelete('CASCADE')
      table.string('keyword', 100).notNullable()
      table.string('normalized_keyword', 100).notNullable()
      table.smallint('display_order').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.unique(['catalogue_item_id', 'normalized_keyword'], {
        indexName: 'catalogue_item_keywords_item_normalized_unique',
      })
      table.unique(['catalogue_item_id', 'display_order'], {
        indexName: 'catalogue_item_keywords_item_order_unique',
      })
      table.index(['normalized_keyword'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_item_keywords
          ADD CONSTRAINT catalogue_item_keywords_value_present
            CHECK (btrim(keyword) <> '' AND btrim(normalized_keyword) <> ''),
          ADD CONSTRAINT catalogue_item_keywords_order_valid
            CHECK (display_order BETWEEN 1 AND 20)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
