import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'base_unit_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('base_unit_id')
        .notNullable()
        .references('id')
        .inTable('base_units')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('change_kind', 32).notNullable()
      table.string('name', 255).notNullable()
      table.string('symbol', 32).notNullable()
      table.string('kind', 32).notNullable()
      table.smallint('precision').notNullable()
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

      table.unique(['base_unit_id', 'version'])
      table.index(['base_unit_id', 'effective_to'])
      table.index(['changed_by_account_id'])
      table.index(['authorization_role_assignment_id'])
      table.index(['authorization_delegation_id'])
      table.index(['resolved_scope_organizational_unit_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE base_unit_versions
          ADD CONSTRAINT base_unit_versions_kind_valid
            CHECK (change_kind IN ('CREATED', 'DETAILS_UPDATED', 'ARCHIVED', 'RESTORED')),
          ADD CONSTRAINT base_unit_versions_unit_kind_valid
            CHECK (kind IN ('COUNTABLE', 'MEASURED')),
          ADD CONSTRAINT base_unit_versions_precision_valid
            CHECK (
              (kind = 'COUNTABLE' AND precision = 0)
              OR
              (kind = 'MEASURED' AND precision BETWEEN 1 AND 3)
            ),
          ADD CONSTRAINT base_unit_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT base_unit_versions_permission_valid
            CHECK (permission_key = 'catalogue.manage'),
          ADD CONSTRAINT base_unit_versions_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT base_unit_versions_symbol_present
            CHECK (btrim(symbol) <> '')
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX base_unit_versions_one_current
          ON base_unit_versions (base_unit_id)
          WHERE effective_to IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
