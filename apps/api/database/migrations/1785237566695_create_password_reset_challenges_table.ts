import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'password_reset_challenges'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.string('purpose', 32).notNullable().checkIn(['INITIAL_SETUP', 'RESET'])
      table.bigInteger('reset_version').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.specificType('request_ip', 'inet').nullable()
      table.string('request_id', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['account_id', 'reset_version'])
      table.unique(['id', 'account_id'])
      table.index(['expires_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE password_reset_challenges
          ADD CONSTRAINT password_reset_challenges_reset_version_positive
            CHECK (reset_version > 0),
          ADD CONSTRAINT password_reset_challenges_expiry_valid
            CHECK (expires_at > created_at)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
