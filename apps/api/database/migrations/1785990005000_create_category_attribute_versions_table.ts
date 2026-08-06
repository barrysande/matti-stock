import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'category_attribute_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('category_attribute_id')
        .notNullable()
        .references('id')
        .inTable('category_attributes')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('change_kind', 32).notNullable()
      table
        .uuid('catalogue_category_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')
      table.string('name', 255).notNullable()
      table.text('description').nullable()
      table.string('data_type', 32).notNullable()
      table.boolean('is_required').notNullable()
      table.string('scope', 32).notNullable()
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

      table.unique(['category_attribute_id', 'version'])
      table.index(['category_attribute_id', 'effective_to'])
      table.index(['catalogue_category_id'])
      table.index(['changed_by_account_id'])
      table.index(['authorization_role_assignment_id'])
      table.index(['authorization_delegation_id'])
      table.index(['resolved_scope_organizational_unit_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE category_attribute_versions
          ADD CONSTRAINT category_attribute_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'SEMANTICS_UPDATED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT category_attribute_versions_data_type_valid
            CHECK (data_type IN ('TEXT', 'NUMBER', 'DATE', 'YES_NO', 'PREDEFINED_CHOICE')),
          ADD CONSTRAINT category_attribute_versions_scope_valid
            CHECK (scope IN ('CATALOGUE', 'INVENTORY_UNIT')),
          ADD CONSTRAINT category_attribute_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT category_attribute_versions_permission_valid
            CHECK (permission_key = 'catalogue.manage'),
          ADD CONSTRAINT category_attribute_versions_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT category_attribute_versions_description_present
            CHECK (description IS NULL OR btrim(description) <> '')
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX category_attribute_versions_one_current
          ON category_attribute_versions (category_attribute_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
