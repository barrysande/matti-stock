import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_accounts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('person_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('people')
        .onDelete('RESTRICT')
      table.string('email', 254).notNullable().unique()
      table.string('password', 255).notNullable()
      table
        .string('status', 32)
        .notNullable()
        .checkIn(['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
      table.bigInteger('credential_version').notNullable().defaultTo(1)
      table.bigInteger('password_reset_version').notNullable().defaultTo(0)
      table.timestamp('last_login_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE user_accounts
          ADD CONSTRAINT user_accounts_email_normalized
            CHECK (email = lower(email)),
          ADD CONSTRAINT user_accounts_credential_version_positive
            CHECK (credential_version > 0),
          ADD CONSTRAINT user_accounts_password_reset_version_nonnegative
            CHECK (password_reset_version >= 0)
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
