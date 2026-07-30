import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import Person from '#models/person'
import UserAccount from '#models/user_account'

interface AccountOptions {
  email?: string
  password?: string
  status?: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
}

async function createAccount(options: AccountOptions = {}) {
  const email = options.email ?? 'account@example.com'
  const person = await Person.create({
    displayName: 'Account Holder',
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  const account = await UserAccount.create({
    personId: person.id,
    email,
    password: options.password ?? 'Current-password-123',
    status: options.status ?? 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })

  return { account, person }
}

async function cleanupAccountTables() {
  const tables = [
    'password_reset_redemptions',
    'password_reset_challenges',
    'access_events',
    'role_assignment_terminations',
    'role_assignments',
    'user_accounts',
    'people',
  ]

  for (const table of tables) {
    await db.from(table).delete()
  }
}

test.group('Authentication sessions', (group) => {
  group.each.setup(async () => {
    await cleanupAccountTables()
    await limiter.clear(['memory'])
  })

  test('logs in an invited account and activates it', async ({ client, assert }) => {
    const { account } = await createAccount({ status: 'INVITED' })

    const response = await client.post('/auth/login').json({
      email: account.email,
      password: 'Current-password-123',
    })

    response.assertStatus(200)
    response.assertBody({ message: 'Login successful.' })

    await account.refresh()
    const activation = await AccessEvent.findByOrFail('eventType', 'ACCOUNT_ACTIVATED')
    const login = await AccessEvent.findByOrFail('eventType', 'LOGIN_SUCCEEDED')

    assert.equal(account.status, 'ACTIVE')
    assert.isNotNull(account.lastLoginAt)
    assert.equal(activation.actorAccountId, account.id)
    assert.equal(login.actorAccountId, account.id)
  })

  test('rejects invalid credentials without revealing which credential failed', async ({
    client,
    assert,
  }) => {
    await createAccount()

    const response = await client.post('/auth/login').json({
      email: 'account@example.com',
      password: 'Wrong-password',
    })

    response.assertStatus(401)
    assert.deepEqual(response.body(), {
      code: 'E_INVALID_CREDENTIALS',
      message: 'Invalid email or password.',
    })

    const event = await AccessEvent.findByOrFail('eventType', 'LOGIN_FAILED')
    assert.isNull(event.targetId)
    assert.isNotNull(event.identifierFingerprint)
  })

  test('rejects login for an inactive account', async ({ client, assert }) => {
    const { account } = await createAccount({ status: 'SUSPENDED' })

    const response = await client.post('/auth/login').json({
      email: account.email,
      password: 'Current-password-123',
    })

    response.assertStatus(401)

    const event = await AccessEvent.findByOrFail('eventType', 'LOGIN_REJECTED_ACCOUNT_STATUS')
    assert.equal(event.targetId, account.id)
  })

  test('rate limits repeated login attempts for one normalized identity', async ({ client }) => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await client.post('/auth/login').json({
        email: '  UNKNOWN@EXAMPLE.COM ',
        password: 'Wrong-password',
      })
      response.assertStatus(401)
    }

    const limited = await client.post('/auth/login').json({
      email: 'unknown@example.com',
      password: 'Wrong-password',
    })
    limited.assertStatus(429)
  })

  test('rejects anonymous access to every protected session route', async ({ client }) => {
    const logout = await client.post('/auth/logout')
    const current = await client.get('/auth/me')
    const changePassword = await client.put('/auth/password').json({
      currentPassword: 'Current-password-123',
      password: 'Replacement-password-123',
    })

    logout.assertStatus(401)
    current.assertStatus(401)
    changePassword.assertStatus(401)
  })

  test('returns the authenticated account through the current-account endpoint', async ({
    client,
  }) => {
    const { account, person } = await createAccount()

    const response = await client
      .get('/auth/me')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })

    response.assertStatus(200)
    response.assertBodyContains({
      data: {
        account: {
          id: account.id,
          email: account.email,
          status: 'ACTIVE',
        },
        person: {
          id: person.id,
          displayName: person.displayName,
        },
        effectivePermissionKeys: [],
        roleAssignments: [],
      },
    })
  })

  test('logs out the authenticated account and records the event', async ({ client, assert }) => {
    const { account } = await createAccount()

    const response = await client
      .post('/auth/logout')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })

    response.assertStatus(200)
    response.assertBody({ message: 'Logged out successfully.' })

    const event = await AccessEvent.findByOrFail('eventType', 'LOGOUT_COMPLETED')
    assert.equal(event.actorAccountId, account.id)
    assert.equal(event.targetId, account.id)
  })

  test('rejects an incorrect current password without changing credentials', async ({
    client,
    assert,
  }) => {
    const { account } = await createAccount()

    const response = await client
      .put('/auth/password')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
      .json({
        currentPassword: 'Wrong-password',
        password: 'Replacement-password-123',
      })

    response.assertStatus(400)
    assert.deepEqual(response.body(), {
      code: 'E_CURRENT_PASSWORD_INVALID',
      message: 'The current password is incorrect.',
    })

    await account.refresh()
    assert.equal(Number(account.credentialVersion), 1)
    assert.isTrue(await hash.use('argon').verify(account.password!, 'Current-password-123'))
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_CHANGE_REJECTED'))
  })

  test('changes the password and invalidates the authenticated session', async ({
    client,
    assert,
  }) => {
    const { account } = await createAccount()

    const response = await client
      .put('/auth/password')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
      .json({
        currentPassword: 'Current-password-123',
        password: 'Replacement-password-123',
      })

    response.assertStatus(200)

    await account.refresh()
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.isTrue(await hash.use('argon').verify(account.password!, 'Replacement-password-123'))
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_CHANGED'))
  })

  test('invalidates a session whose credential version is stale', async ({ client, assert }) => {
    const { account } = await createAccount()

    const response = await client
      .get('/auth/me')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': 0 })

    response.assertStatus(401)
    assert.deepEqual(response.body(), {
      code: 'E_UNAUTHORIZED_ACCESS',
      message: 'Authentication is required.',
    })

    const event = await AccessEvent.findByOrFail('eventType', 'SESSION_INVALIDATED')
    assert.equal(event.targetId, account.id)
  })
})
