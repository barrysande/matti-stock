import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'catalogue_item_version_attribute_values'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary()
      table
        .uuid('catalogue_item_version_id')
        .notNullable()
        .references('id')
        .inTable('catalogue_item_versions')
        .onDelete('RESTRICT')
      table
        .uuid('category_attribute_id')
        .notNullable()
        .references('id')
        .inTable('category_attributes')
        .onDelete('RESTRICT')
      table.string('attribute_name', 255).notNullable()
      table.string('data_type', 32).notNullable()
      table.text('text_value').nullable()
      table.specificType('number_value', 'numeric').nullable()
      table.date('date_value').nullable()
      table.boolean('yes_no_value').nullable()
      table.uuid('choice_id').nullable()
      table.string('choice_label', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()

      table.unique(['catalogue_item_version_id', 'category_attribute_id'], {
        indexName: 'catalogue_item_version_values_version_attribute_unique',
      })
      table
        .foreign(
          ['choice_id', 'category_attribute_id'],
          'catalogue_item_version_values_choice_attribute_fk'
        )
        .references(['id', 'category_attribute_id'])
        .inTable('category_attribute_choices')
        .onDelete('RESTRICT')
      table.index(['category_attribute_id'], 'catalogue_item_version_values_attribute_index')
      table.index(['choice_id'], 'catalogue_item_version_values_choice_index')
    })

    this.defer(async (db) => {
      await db.rawQuery(`
        ALTER TABLE catalogue_item_version_attribute_values
          ADD CONSTRAINT catalogue_item_version_values_name_present
            CHECK (btrim(attribute_name) <> ''),
          ADD CONSTRAINT catalogue_item_version_values_type_valid
            CHECK (data_type IN ('TEXT', 'NUMBER', 'DATE', 'YES_NO', 'PREDEFINED_CHOICE')),
          ADD CONSTRAINT catalogue_item_version_values_text_present
            CHECK (text_value IS NULL OR btrim(text_value) <> ''),
          ADD CONSTRAINT catalogue_item_version_values_number_finite
            CHECK (number_value IS NULL OR number_value::text NOT IN ('NaN', 'Infinity', '-Infinity')),
          ADD CONSTRAINT catalogue_item_version_values_choice_label_valid
            CHECK (
              (data_type = 'PREDEFINED_CHOICE' AND choice_label IS NOT NULL AND btrim(choice_label) <> '')
              OR
              (data_type <> 'PREDEFINED_CHOICE' AND choice_label IS NULL)
            ),
          ADD CONSTRAINT catalogue_item_version_values_typed_value_valid
            CHECK (
              (data_type = 'TEXT' AND text_value IS NOT NULL AND number_value IS NULL AND date_value IS NULL AND yes_no_value IS NULL AND choice_id IS NULL)
              OR
              (data_type = 'NUMBER' AND text_value IS NULL AND number_value IS NOT NULL AND date_value IS NULL AND yes_no_value IS NULL AND choice_id IS NULL)
              OR
              (data_type = 'DATE' AND text_value IS NULL AND number_value IS NULL AND date_value IS NOT NULL AND yes_no_value IS NULL AND choice_id IS NULL)
              OR
              (data_type = 'YES_NO' AND text_value IS NULL AND number_value IS NULL AND date_value IS NULL AND yes_no_value IS NOT NULL AND choice_id IS NULL)
              OR
              (data_type = 'PREDEFINED_CHOICE' AND text_value IS NULL AND number_value IS NULL AND date_value IS NULL AND yes_no_value IS NULL AND choice_id IS NOT NULL)
            )
      `)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
