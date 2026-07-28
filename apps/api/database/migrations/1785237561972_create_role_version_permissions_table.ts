import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_version_permissions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid('role_version_id')
        .notNullable()
        .references('id')
        .inTable('role_versions')
        .onDelete('RESTRICT')
      table
        .string('permission_key', 100)
        .notNullable()
        .references('key')
        .inTable('permissions')
        .onDelete('RESTRICT')

      table.primary(['role_version_id', 'permission_key'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
