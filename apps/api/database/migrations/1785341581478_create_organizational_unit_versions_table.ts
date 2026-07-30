import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizational_unit_versions'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('organizational_unit_id')
        .notNullable()
        .references('id')
        .inTable('organizational_units')
        .onDelete('RESTRICT')
      table.integer('version').notNullable()
      table.string('name', 255).notNullable()
      table
        .string('unit_type', 32)
        .notNullable()
        .checkIn(['INSTITUTE', 'DEPARTMENT', 'SUB_DEPARTMENT'])
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable('organizational_units')
        .onDelete('RESTRICT')
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('effective_from', { useTz: true }).notNullable()
      table.timestamp('effective_to', { useTz: true }).nullable()
      table
        .uuid('changed_by_account_id')
        .nullable()
        .references('id')
        .inTable('user_accounts')
        .onDelete('RESTRICT')
      table.text('reason').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['organizational_unit_id', 'version'])
      table.index(['organizational_unit_id', 'effective_to'])
      table.index(['parent_id'])
      table.index(['changed_by_account_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE organizational_unit_versions
          ADD CONSTRAINT organizational_unit_versions_time_range_valid
            CHECK (effective_to IS NULL OR effective_from < effective_to),
          ADD CONSTRAINT organizational_unit_versions_parent_valid
            CHECK (
              (unit_type = 'INSTITUTE' AND parent_id IS NULL)
              OR
              (unit_type IN ('DEPARTMENT', 'SUB_DEPARTMENT') AND parent_id IS NOT NULL)
            )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX organizational_unit_versions_one_current
          ON organizational_unit_versions (organizational_unit_id)
          WHERE effective_to IS NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX organizational_units_active_sibling_name_unique
          ON organizational_units (parent_id, lower(name))
          WHERE archived_at IS NULL AND parent_id IS NOT NULL
      `)

      await db.rawQuery(`
        INSERT INTO organizational_unit_versions (
          id,
          organizational_unit_id,
          version,
          name,
          unit_type,
          parent_id,
          archived_at,
          effective_from,
          effective_to,
          changed_by_account_id,
          reason,
          created_at
        )
        SELECT
          gen_random_uuid(),
          id,
          1,
          name,
          unit_type,
          parent_id,
          archived_at,
          created_at,
          NULL,
          NULL,
          'Initial organizational structure recorded before version history',
          NOW()
        FROM organizational_units
      `)
    })
  }

  async down() {
    this.defer(async (db) => {
      await db.rawQuery('DROP INDEX IF EXISTS organizational_units_active_sibling_name_unique')
    })
    this.schema.dropTable(this.tableName)
  }
}
