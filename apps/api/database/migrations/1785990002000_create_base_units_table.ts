import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'base_units'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 255).notNullable()
      table.string('symbol', 32).notNullable()
      table.string('kind', 32).notNullable()
      table.smallint('precision').notNullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE base_units
          ADD CONSTRAINT base_units_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT base_units_symbol_present
            CHECK (btrim(symbol) <> ''),
          ADD CONSTRAINT base_units_kind_valid
            CHECK (kind IN ('COUNTABLE', 'MEASURED')),
          ADD CONSTRAINT base_units_precision_valid
            CHECK (
              (kind = 'COUNTABLE' AND precision = 0)
              OR
              (kind = 'MEASURED' AND precision BETWEEN 1 AND 3)
            )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX base_units_active_name_unique
          ON base_units (lower(name))
          WHERE archived_at IS NULL
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX base_units_active_symbol_unique
          ON base_units (lower(symbol))
          WHERE archived_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
