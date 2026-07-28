import { Exception } from '@adonisjs/core/exceptions'

export default class DuplicateException extends Exception {
  static status = 409
  static code = 'E_DUPLICATE'

  static is(error: unknown) {
    return (error as { code?: string }).code === '23505'
  }

  static throwIf(error: unknown, message: string): never {
    if (this.is(error)) {
      throw new this(message)
    }

    throw error
  }
}
