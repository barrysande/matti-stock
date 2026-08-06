import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_item_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_item_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_items')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('change_kind', 32).notNullable()
      table.string('catalogue_code', 11).notNullable()
      table.string('name', 255).notNullable()
      table.string('normalized_name', 255).notNullable()
      table.text('description').nullable()
      table
        .uuid('catalogue_category_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_categories')
        .onDelete('RESTRICT')
      table.string('stock_type', 32).notNullable()
      table.string('tracking_method', 32).notNullable()
      table
        .uuid('base_unit_id')
        .notNullable()
        .references('id')
        .inTable('base_units')
        .onDelete('RESTRICT')
      table.string('identification_status', 32).notNullable()
      table.timestamp('inventory_semantics_locked_at', { useTz: true }).nullable()
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

      table.unique(['catalogue_item_id', 'version'], {
        indexName: 'catalogue_item_versions_item_number_unique',
      })
      table.index(['catalogue_item_id', 'effective_to'], 'catalogue_item_versions_current_index')
      table.index(['changed_by_account_id'], 'catalogue_item_versions_actor_index')
      table.index(['authorization_role_assignment_id'], 'catalogue_item_versions_assignment_index')
      table.index(['authorization_delegation_id'], 'catalogue_item_versions_delegation_index')
      table.index(['resolved_scope_organizational_unit_id'], 'catalogue_item_versions_scope_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_item_versions
          ADD CONSTRAINT catalogue_item_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'CLASSIFICATION_UPDATED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT catalogue_item_versions_code_format
            CHECK (catalogue_code ~ '^ITEM-[0-9]{6}$'),
          ADD CONSTRAINT catalogue_item_versions_name_present
            CHECK (btrim(name) <> '' AND btrim(normalized_name) <> ''),
          ADD CONSTRAINT catalogue_item_versions_description_present
            CHECK (description IS NULL OR btrim(description) <> ''),
          ADD CONSTRAINT catalogue_item_versions_stock_type_valid
            CHECK (stock_type IN ('FIXED_NON_CONSUMABLE', 'CONSUMABLE')),
          ADD CONSTRAINT catalogue_item_versions_tracking_method_valid
            CHECK (tracking_method IN ('INDIVIDUAL', 'QUANTITY')),
          ADD CONSTRAINT catalogue_item_versions_identification_status_valid
            CHECK (identification_status IN ('CONFIRMED', 'PLACEHOLDER')),
          ADD CONSTRAINT catalogue_item_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT catalogue_item_versions_permission_valid
            CHECK (permission_key = 'catalogue.manage'),
          ADD CONSTRAINT catalogue_item_versions_reason_present
            CHECK (btrim(reason) <> '')
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX catalogue_item_versions_one_current
          ON catalogue_item_versions (catalogue_item_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
