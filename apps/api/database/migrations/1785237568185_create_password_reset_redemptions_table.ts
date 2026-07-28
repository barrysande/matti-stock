import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_redemptions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('challenge_id').primary()
      table.uuid('account_id').notNullable()
      table.specificType('request_ip', 'inet').nullable()
      table.string('request_id', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table
        .foreign(['challenge_id', 'account_id'])
        .references(['id', 'account_id'])
        .inTable('password_reset_challenges')
        .onDelete('RESTRICT')

      table.index(['account_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
