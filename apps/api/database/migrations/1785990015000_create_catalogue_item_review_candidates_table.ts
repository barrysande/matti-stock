import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_item_review_candidates'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_item_version_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_item_versions')
        .onDelete('RESTRICT')
      table
        .uuid('candidate_catalogue_item_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_items')
        .onDelete('RESTRICT')
      table.string('primary_match_kind', 32).notNullable()
      table.smallint('display_order').notNullable()
      table.text('confirmation_reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['catalogue_item_version_id', 'candidate_catalogue_item_id'], {
        indexName: 'catalogue_item_review_candidates_pair_unique',
      })
      table.unique(['catalogue_item_version_id', 'display_order'], {
        indexName: 'catalogue_item_review_candidates_order_unique',
      })
      table.index(['candidate_catalogue_item_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_item_review_candidates
          ADD CONSTRAINT catalogue_item_review_candidates_kind_valid
            CHECK (primary_match_kind IN ('EXACT_NAME', 'KEYWORD', 'PREFIX', 'SUBSTRING')),
          ADD CONSTRAINT catalogue_item_review_candidates_order_valid
            CHECK (display_order BETWEEN 1 AND 10),
          ADD CONSTRAINT catalogue_item_review_candidates_reason_present
            CHECK (btrim(confirmation_reason) <> '')
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
