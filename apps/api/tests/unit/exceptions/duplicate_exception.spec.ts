import { test } from '@japa/runner'
import DuplicateException from '#exceptions/duplicate_exception'

const constraints = ['people_primary_email_unique'] as const
const message = 'An account with this email already exists'

function captureError(callback: () => never) {
  try {
    callback()
  } catch (error) {
    return error
  }

  throw new Error('Expected the operation to fail')
}

test.group('Duplicate exception', () => {
  test('translates an expected unique constraint without exposing database details', ({
    assert,
  }) => {
    const databaseError = {
      code: '23505',
      constraint: 'people_primary_email_unique',
      detail: 'Key (primary_email)=(private@example.com) already exists.',
      query: 'insert into "people" ("primary_email") values ($1)',
    }

    const error = captureError(() =>
      DuplicateException.throwIf(databaseError, message, constraints)
    )

    assert.instanceOf(error, DuplicateException)
    assert.equal((error as Error).message, message)
    assert.notInclude((error as Error).message, databaseError.detail)
    assert.notInclude((error as Error).message, databaseError.query)
  })

  test('rethrows an unexpected unique constraint unchanged', ({ assert }) => {
    const databaseError = {
      code: '23505',
      constraint: 'role_versions_role_id_version_unique',
      detail: 'Key (role_id, version) already exists.',
    }

    const error = captureError(() =>
      DuplicateException.throwIf(databaseError, message, constraints)
    )

    assert.strictEqual(error, databaseError)
  })

  test('rethrows other database and non-object errors unchanged', ({ assert }) => {
    const databaseError = {
      code: '42P01',
      message: 'relation "internal_table" does not exist',
    }
    const databaseFailure = captureError(() =>
      DuplicateException.throwIf(databaseError, message, constraints)
    )
    const unknownFailure = captureError(() =>
      DuplicateException.throwIf('failure', message, constraints)
    )

    assert.strictEqual(databaseFailure, databaseError)
    assert.equal(unknownFailure, 'failure')
  })
})
