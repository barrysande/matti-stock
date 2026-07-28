import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'access_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('event_type', 100).notNullable()
      table.string('actor_type', 32).notNullable().checkIn(['SYSTEM', 'ACCOUNT'])
      table
        .uuid('actor_account_id')
        .nullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.string('target_type', 100).notNullable()
      table.uuid('target_id').nullable()
      table.text('reason').nullable()
      table.string('identifier_fingerprint', 64).nullable()
      table.specificType('request_ip', 'inet').nullable()
      table.string('request_id', 255).nullable()
      table.jsonb('metadata').notNullable().defaultTo('{}')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.index(['event_type'])
      table.index(['actor_account_id'])
      table.index(['target_type', 'target_id'])
      table.index(['created_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE access_events
          ADD CONSTRAINT access_events_actor_valid
            CHECK (
              (actor_type = 'SYSTEM' AND actor_account_id IS NULL)
              OR
              (actor_type = 'ACCOUNT' AND actor_account_id IS NOT NULL)
            ),
          ADD CONSTRAINT access_events_identifier_fingerprint_valid
            CHECK (
              identifier_fingerprint IS NULL
              OR identifier_fingerprint ~ '^[0-9a-f]{64}$'
            )
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
