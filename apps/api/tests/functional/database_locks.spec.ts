import { randomUUID } from 'node:crypto'
import lockManager from '@adonisjs/lock/services/main'
import { test } from '@japa/runner'

test.group('Database atomic locks', () => {
  test('allows only one owner to hold a named lock', async ({ assert }) => {
    const key = `tests:database-lock:${randomUUID()}`
    const holder = lockManager.createLock(key, '10s')
    const contender = lockManager.createLock(key, '10s')
    let holderAcquired = false
    let contenderAcquired = false

    try {
      holderAcquired = await holder.acquireImmediately()
      assert.isTrue(holderAcquired)

      contenderAcquired = await contender.acquireImmediately()
      assert.isFalse(contenderAcquired)
    } finally {
      if (contenderAcquired) {
        await contender.release()
      }

      if (holderAcquired) {
        await holder.release()
      }
    }

    const successor = lockManager.createLock(key, '10s')
    let successorAcquired = false

    try {
      successorAcquired = await successor.acquireImmediately()
      assert.isTrue(successorAcquired)
    } finally {
      if (successorAcquired) {
        await successor.release()
      }
    }
  })
})
