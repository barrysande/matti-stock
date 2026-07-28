import { randomUUID } from 'node:crypto'
import { beforeCreate, hasOne } from '@adonisjs/lucid/orm'
import { PersonSchema } from '#database/schema'
import UserAccount from '#models/user_account'
import type { HasOne } from '@adonisjs/lucid/types/relations'

export default class Person extends PersonSchema {
  @beforeCreate()
  static assignUuid(person: Person) {
    person.id = randomUUID()
  }

  @hasOne(() => UserAccount)
  declare account: HasOne<typeof UserAccount>
}
