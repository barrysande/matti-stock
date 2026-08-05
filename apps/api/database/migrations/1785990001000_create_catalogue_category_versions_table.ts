import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_category_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_category_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('change_kind', 32).notNullable()
      table.string('name', 255).notNullable()
      table.text('description').notNullable()
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('effective_from', { useTz: true }).notNullable()
      table.timestamp('effective_to', { useTz: true }).nullable()
      table
        .uuid('changed_by_account_id')
        .notNullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table
        .uuid('authorization_role_assignment_id')
        .notNullable()
        .references('id')
        .inTable('role_assignments')
        .onDelete('RESTRICT')
      table
        .uuid('authorization_delegation_id')
        .nullable()
        .references('id')
        .inTable('delegations')
        .onDelete('RESTRICT')
      table
        .string('permission_key', 100)
        .notNullable()
        .references('key')
        .inTable('permissions')
        .onDelete('RESTRICT')
      table
        .uuid('resolved_scope_organizational_unit_id')
        .notNullable()
        .references('id')
        .inTable('organizational_units')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['catalogue_category_id', 'version'])
      table.index(['catalogue_category_id', 'effective_to'])
      table.index(['parent_id'])
      table.index(['changed_by_account_id'])
      table.index(['authorization_role_assignment_id'])
      table.index(['authorization_delegation_id'])
      table.index(['resolved_scope_organizational_unit_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_category_versions
          ADD CONSTRAINT catalogue_category_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'REPARENTED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT catalogue_category_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT catalogue_category_versions_parent_valid
            CHECK (parent_id IS NULL OR parent_id <> catalogue_category_id),
          ADD CONSTRAINT catalogue_category_versions_permission_valid
            CHECK (permission_key = 'catalogue.manage'),
          ADD CONSTRAINT catalogue_category_versions_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT catalogue_category_versions_description_present
            CHECK (btrim(description) <> '')
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_category_versions_one_current
          ON catalogue_category_versions (catalogue_category_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
