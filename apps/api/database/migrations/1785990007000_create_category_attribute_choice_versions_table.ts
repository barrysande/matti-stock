import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'category_attribute_choice_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('category_attribute_choice_id')
        .notNullable()
        .references('id')
        .inTable('category_attribute_choices')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('change_kind', 32).notNullable()
      table.string('label', 255).notNullable()
      table.integer('display_order').nullable()
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

      table.unique(['category_attribute_choice_id', 'version'], {
        indexName: 'category_attribute_choice_versions_number_unique',
      })
      table.index(
        ['category_attribute_choice_id', 'effective_to'],
        'category_attribute_choice_versions_current_index'
      )
      table.index(['changed_by_account_id'], 'category_attribute_choice_versions_actor_index')
      table.index(
        ['authorization_role_assignment_id'],
        'category_attribute_choice_versions_assignment_index'
      )
      table.index(
        ['authorization_delegation_id'],
        'category_attribute_choice_versions_delegation_index'
      )
      table.index(
        ['resolved_scope_organizational_unit_id'],
        'category_attribute_choice_versions_scope_index'
      )
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE category_attribute_choice_versions
          ADD CONSTRAINT category_attribute_choice_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'LABEL_UPDATED', 'REORDERED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT category_attribute_choice_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT category_attribute_choice_versions_permission_valid
            CHECK (permission_key = 'catalogue.manage'),
          ADD CONSTRAINT category_attribute_choice_versions_label_present
            CHECK (btrim(label) <> ''),
          ADD CONSTRAINT category_attribute_choice_versions_order_valid
            CHECK (display_order IS NULL OR display_order > 0)
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX category_attribute_choice_versions_one_current
          ON category_attribute_choice_versions (category_attribute_choice_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
