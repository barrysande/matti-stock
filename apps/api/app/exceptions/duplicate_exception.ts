import { Exception } from '@adonisjs/core/exceptions'

export default class DuplicateException extends Exception {
  static status = 409
  static code = 'E_DUPLICATE'

  static is(error: unknown, constraints: readonly string[]) {
    if (typeof error !== 'object' || error === null) {
      return false
    }

    const databaseError = error as { code?: unknown; constraint?: unknown }
    return (
      databaseError.code === '23505' &&
      typeof databaseError.constraint === 'string' &&
      constraints.includes(databaseError.constraint)
    )
  }

  static throwIf(error: unknown, message: string, constraints: readonly string[]): never {
    if (this.is(error, constraints)) {
      throw new this(message)
    }

    throw error
  }
}
