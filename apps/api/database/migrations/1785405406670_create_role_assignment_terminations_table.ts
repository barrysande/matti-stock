import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_assignment_terminations'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('assignment_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('role_assignments')
        .onDelete('RESTRICT')
      table.string('kind', 32).notNullable().checkIn(['ENDED', 'CANCELLED', 'REPLACED'])
      table.timestamp('effective_at', { useTz: true }).notNullable()
      table
        .uuid('replacement_assignment_id')
        .nullable()
        .unique()
        .references('id')
        .inTable('role_assignments')
        .onDelete('RESTRICT')
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

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE role_assignment_terminations
          ADD CONSTRAINT role_assignment_terminations_replacement_valid
            CHECK (
              (kind = 'REPLACED' AND replacement_assignment_id IS NOT NULL)
              OR
              (kind IN ('ENDED', 'CANCELLED') AND replacement_assignment_id IS NULL)
            )
      `)

      await db.rawQuery(`
        ALTER TABLE role_assignment_terminations
          ADD CONSTRAINT role_assignment_terminations_not_self_replacing
            CHECK (
              replacement_assignment_id IS NULL
              OR replacement_assignment_id <> assignment_id
            )
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
