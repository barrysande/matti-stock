import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'organizational_units'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table.string('name', 255).notNullable()
      table
        .string('unit_type', 32)
        .notNullable()
        .checkIn(['INSTITUTE', 'DEPARTMENT', 'SUB_DEPARTMENT'])
      table
        .uuid('parent_id')
        .nullable()
        .references('id')
        .inTable(this.tableName)
        .onDelete('RESTRICT')
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['parent_id'])
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE organizational_units
          ADD CONSTRAINT organizational_units_parent_valid
            CHECK (
              (unit_type = 'INSTITUTE' AND parent_id IS NULL)
              OR
              (unit_type IN ('DEPARTMENT', 'SUB_DEPARTMENT') AND parent_id IS NOT NULL)
            )
      `)

      await db.rawQuery(`
        CREATE UNIQUE INDEX organizational_units_single_active_institute
          ON organizational_units (unit_type)
          WHERE unit_type = 'INSTITUTE' AND archived_at IS NULL
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
