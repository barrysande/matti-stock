import env from '#start/env'
import { test } from '@japa/runner'

test.group('Health checks', () => {
  test('reports that the HTTP process is live without requiring credentials', async ({
    client,
  }) => {
    const response = await client.get('/health/live')

    response.assertStatus(200)
  })

  test('rejects readiness checks without the monitoring secret', async ({ client, assert }) => {
    const response = await client.get('/health/ready')

    response.assertStatus(401)
    assert.deepEqual(response.body(), {
      code: 'E_UNAUTHORIZED_ACCESS',
      message: 'Unauthorized access',
    })
  })

  test('reports readiness to an authorized monitor', async ({ client }) => {
    const response = await client
      .get('/health/ready')
      .header('x-monitoring-secret', env.get('HEALTH_CHECK_SECRET').release())

    response.assertStatus(200)
    response.assertBodyContains({ isHealthy: true })
  })
})
