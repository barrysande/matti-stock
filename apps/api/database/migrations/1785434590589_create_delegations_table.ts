import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'delegations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('delegator_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table
        .uuid('delegate_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.timestamp('starts_at', { useTz: true }).notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['delegator_account_id'])
      table.index(['delegate_account_id'])
      table.index(['starts_at', 'expires_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE delegations
          ADD CONSTRAINT delegations_accounts_distinct
            CHECK (delegator_account_id <> delegate_account_id),
          ADD CONSTRAINT delegations_time_range_valid
            CHECK (starts_at < expires_at)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
