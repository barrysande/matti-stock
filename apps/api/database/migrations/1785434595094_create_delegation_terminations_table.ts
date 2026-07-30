import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'delegation_terminations'

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
      table
        .string('kind', 32)
        .notNullable()
        .checkIn(['REVOKED', 'RELINQUISHED', 'ADMINISTRATIVELY_TERMINATED'])
      table.timestamp('effective_at', { useTz: true }).notNullable()
      table
        .uuid('terminated_by_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['effective_at'])
      table.index(['terminated_by_account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
