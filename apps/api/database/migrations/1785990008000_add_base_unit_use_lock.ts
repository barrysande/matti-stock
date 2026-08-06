import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('base_units', (table) => {
      table.timestamp('first_used_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable('base_units', (table) => {
      table.dropColumn('first_used_at')
    })
  }
}
