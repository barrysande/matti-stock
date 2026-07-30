import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'delegation_assignments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('delegation_id')
        .notNullable()
        .references('id')
        .inTable('delegations')
        .onDelete('RESTRICT')
      table
        .uuid('source_assignment_id')
        .notNullable()
        .references('id')
        .inTable('role_assignments')
        .onDelete('RESTRICT')
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['delegation_id', 'source_assignment_id'])
      table.index(['source_assignment_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
