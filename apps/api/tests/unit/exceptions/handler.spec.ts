import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'
import HttpExceptionHandler from '#exceptions/handler'

function responseContext() {
  const result: { body?: unknown; status?: number } = {}
  const response = {
    status(status: number) {
      result.status = status
      return this
    },
    send(body: unknown) {
      result.body = body
      return body
    },
  }

  return {
    context: { response } as unknown as HttpContext,
    result,
  }
}

test.group('HTTP exception handler', () => {
  test('replaces an unexpected database error with a safe response', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    const { context, result } = responseContext()
    const databaseError = Object.assign(
      new Error('select * from "people": relation "people" does not exist'),
      {
        code: '42P01',
        query: 'select * from "people"',
      }
    )

    await handler.handle(databaseError, context)

    assert.equal(result.status, 500)
    assert.deepEqual(result.body, {
      code: 'E_INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    })
    assert.notInclude(JSON.stringify(result.body), databaseError.message)
    assert.notInclude(JSON.stringify(result.body), databaseError.query)
  })

  test('preserves a server error status without exposing its message', async ({ assert }) => {
    const handler = new HttpExceptionHandler()
    const { context, result } = responseContext()

    await handler.handle(
      Object.assign(new Error('Private dependency health details'), { status: 503 }),
      context
    )

    assert.equal(result.status, 503)
    assert.deepEqual(result.body, {
      code: 'E_INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    })
  })
})
