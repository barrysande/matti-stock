import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('base_units', (table) => {
      table.timestamp('first_used_at', { useTz: true }).nullable()
    })

    this.schema.alterTable('category_attribute_choices', (table) => {
      table.unique(['id', 'category_attribute_id'], {
        indexName: 'category_attribute_choices_id_attribute_unique',
      })
    })
  }

  async down() {
    this.schema.alterTable('category_attribute_choices', (table) => {
      table.dropUnique(
        ['id', 'category_attribute_id'],
        'category_attribute_choices_id_attribute_unique'
      )
    })

    this.schema.alterTable('base_units', (table) => {
      table.dropColumn('first_used_at')
    })
  }
}
