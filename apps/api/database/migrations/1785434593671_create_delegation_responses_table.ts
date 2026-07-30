import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'delegation_responses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('delegation_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('delegations')
        .onDelete('RESTRICT')
      table.string('kind', 32).notNullable().checkIn(['ACCEPTED', 'REJECTED'])
      table
        .uuid('responded_by_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['responded_by_account_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE delegation_responses
          ADD CONSTRAINT delegation_responses_reason_valid
            CHECK (
              (kind = 'ACCEPTED' AND (reason IS NULL OR btrim(reason) <> ''))
              OR
              (kind = 'REJECTED' AND reason IS NOT NULL AND btrim(reason) <> '')
            )
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
