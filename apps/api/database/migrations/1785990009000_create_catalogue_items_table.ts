import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_items'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
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
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['catalogue_category_id'])
      table.index(['base_unit_id'])
      table.index(['stock_type', 'tracking_method'])
      table.index(['archived_at'])
    })

    this.defer(async (db) => {
      await db.rawQuery('DROP SEQUENCE IF EXISTS catalogue_item_code_sequence')

      await db.rawQuery(`
        CREATE SEQUENCE catalogue_item_code_sequence
          AS integer
          MINVALUE 1
          MAXVALUE 999999
          NO CYCLE
          OWNED BY catalogue_items.catalogue_code
      `)

      await db.rawQuery(`
        ALTER TABLE catalogue_items
          ALTER COLUMN catalogue_code
            SET DEFAULT ('ITEM-' || lpad(nextval('catalogue_item_code_sequence')::text, 6, '0')),
          ADD CONSTRAINT catalogue_items_code_format
            CHECK (catalogue_code ~ '^ITEM-[0-9]{6}$'),
          ADD CONSTRAINT catalogue_items_name_present
            CHECK (btrim(name) <> ''),
          ADD CONSTRAINT catalogue_items_normalized_name_present
            CHECK (btrim(normalized_name) <> ''),
          ADD CONSTRAINT catalogue_items_description_present
            CHECK (description IS NULL OR btrim(description) <> ''),
          ADD CONSTRAINT catalogue_items_stock_type_valid
            CHECK (stock_type IN ('FIXED_NON_CONSUMABLE', 'CONSUMABLE')),
          ADD CONSTRAINT catalogue_items_tracking_method_valid
            CHECK (tracking_method IN ('INDIVIDUAL', 'QUANTITY')),
          ADD CONSTRAINT catalogue_items_identification_status_valid
            CHECK (identification_status IN ('CONFIRMED', 'PLACEHOLDER')),
          ADD CONSTRAINT catalogue_items_code_unique UNIQUE (catalogue_code),
          ADD CONSTRAINT catalogue_items_normalized_name_unique UNIQUE (normalized_name)
      `)

      await db.rawQuery('DROP FUNCTION IF EXISTS prevent_catalogue_item_code_change()')

      await db.rawQuery(`
        CREATE FUNCTION prevent_catalogue_item_code_change()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          IF NEW.catalogue_code IS DISTINCT FROM OLD.catalogue_code THEN
            RAISE EXCEPTION 'catalogue item codes are immutable';
          END IF;
          RETURN NEW;
        END;
        $$
      `)

      await db.rawQuery(`
        CREATE TRIGGER catalogue_items_code_immutable
          BEFORE UPDATE OF catalogue_code ON catalogue_items
          FOR EACH ROW
          EXECUTE FUNCTION prevent_catalogue_item_code_change()
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.defer(async (db) => {
      await db.rawQuery('DROP FUNCTION IF EXISTS prevent_catalogue_item_code_change()')
      await db.rawQuery('DROP SEQUENCE IF EXISTS catalogue_item_code_sequence')
    })
  }
}
