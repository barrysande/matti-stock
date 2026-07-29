import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import limiter from '@adonisjs/limiter/services/main'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import PasswordResetChallenge from '#models/password_reset_challenge'
import PasswordResetRedemption from '#models/password_reset_redemption'
import Person from '#models/person'
import UserAccount from '#models/user_account'
import PasswordChallengeService from '#services/password_challenge_service'

const GENERIC_RESET_MESSAGE = 'If an account uses that email, a password reset link will be sent.'

interface AccountOptions {
  email?: string
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
    password: 'Current-password-123',
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
    'role_assignments',
    'user_accounts',
    'people',
  ]

  for (const table of tables) {
    await db.from(table).delete()
  }
}

async function issueChallenge(account: UserAccount) {
  const service = await app.container.make(PasswordChallengeService)
  const challenge = await service.request(
    { email: account.email },
    { ip: '127.0.0.1', requestId: 'password-reset-test' }
  )

  if (!challenge) {
    throw new Error('Expected password reset challenge to be created')
  }

  return { challenge, token: service.createToken(challenge) }
}

test.group('Password resets', (group) => {
  group.each.setup(async () => {
    await cleanupAccountTables()
    await limiter.clear(['memory'])
  })

  group.each.teardown(() => {
    QueueManager.restore()
  })

  test('returns a neutral response and queues a challenge for a known account', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account } = await createAccount()

    const response = await client.post('/auth/password/forgot').json({
      email: account.email,
    })

    response.assertStatus(200)
    response.assertBody({ message: GENERIC_RESET_MESSAGE })

    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    fake.assertPushedCount(1, { queue: 'emails' })
    assert.isNotNull(challenge.id)
    assert.equal(challenge.purpose, 'RESET')
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_RESET_REQUESTED'))
  })

  test('returns the same response without queuing work for an unknown account', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()

    const response = await client.post('/auth/password/forgot').json({
      email: 'unknown@example.com',
    })

    response.assertStatus(200)
    response.assertBody({ message: GENERIC_RESET_MESSAGE })
    fake.assertNothingPushed()

    const event = await AccessEvent.findByOrFail(
      'eventType',
      'PASSWORD_RESET_REQUESTED_UNKNOWN_ACCOUNT'
    )
    assert.isNotNull(event.identifierFingerprint)
  })

  test('returns the same response for a deactivated account', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account } = await createAccount({ status: 'DEACTIVATED' })

    const response = await client.post('/auth/password/forgot').json({
      email: account.email,
    })

    response.assertStatus(200)
    response.assertBody({ message: GENERIC_RESET_MESSAGE })
    fake.assertNothingPushed()
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.isNotNull(
      await AccessEvent.findBy('eventType', 'PASSWORD_RESET_REJECTED_ACCOUNT_STATUS')
    )
  })

  test('rate limits repeated reset requests for one normalized identity', async ({ client }) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await client.post('/auth/password/forgot').json({
        email: '  UNKNOWN@EXAMPLE.COM ',
      })
      response.assertStatus(200)
    }

    const limited = await client.post('/auth/password/forgot').json({
      email: 'unknown@example.com',
    })
    limited.assertStatus(429)
  })

  test('resets the password with a current single-use challenge', async ({ client, assert }) => {
    const { account } = await createAccount()
    const { challenge, token } = await issueChallenge(account)

    const response = await client.post('/auth/password/reset').json({
      token,
      password: 'Replacement-password-123',
    })

    response.assertStatus(200)
    response.assertBody({
      message: 'Password reset successfully. Sign in with the new password.',
    })

    await account.refresh()
    const redemption = await PasswordResetRedemption.findByOrFail('challengeId', challenge.id)
    assert.equal(redemption.accountId, account.id)
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 2)
    assert.isTrue(await hash.use('argon').verify(account.password!, 'Replacement-password-123'))
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_RESET_COMPLETED'))
  })

  test('rejects a malformed reset token', async ({ client, assert }) => {
    const response = await client.post('/auth/password/reset').json({
      token: 'not-an-encrypted-token',
      password: 'Replacement-password-123',
    })

    response.assertStatus(422)
    assert.deepEqual(response.body(), {
      code: 'E_INVALID_PASSWORD_RESET',
      message: 'This password reset link is invalid or has expired.',
    })

    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.isNull(event.targetId)
    assert.equal(event.metadata.reason, 'INVALID_TOKEN')
    assert.isNotNull(event.requestIp)
    assert.isNotNull(event.requestId)
    assert.notInclude(JSON.stringify(event.metadata), 'not-an-encrypted-token')
    assert.notInclude(JSON.stringify(event.metadata), 'Replacement-password-123')
  })

  test('rejects a missing reset challenge', async ({ client, assert }) => {
    const { account } = await createAccount()
    const { challenge, token } = await issueChallenge(account)
    await challenge.delete()

    const response = await client.post('/auth/password/reset').json({
      token,
      password: 'Replacement-password-123',
    })

    response.assertStatus(422)

    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.isNull(event.targetId)
    assert.equal(event.metadata.reason, 'CHALLENGE_NOT_FOUND')
    assert.equal(event.metadata.challengeId, challenge.id)
  })

  test('rejects an expired reset challenge', async ({ client, assert }) => {
    const { account } = await createAccount()
    const { challenge, token } = await issueChallenge(account)
    challenge.createdAt = DateTime.now().minus({ hours: 2 })
    challenge.expiresAt = DateTime.now().minus({ hours: 1 })
    await challenge.save()

    const response = await client.post('/auth/password/reset').json({
      token,
      password: 'Replacement-password-123',
    })

    response.assertStatus(422)

    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.equal(event.targetId, account.id)
    assert.equal(event.metadata.reason, 'EXPIRED')
    assert.equal(event.metadata.challengeId, challenge.id)
  })

  test('rejects a challenge superseded by a later request', async ({ client, assert }) => {
    const { account } = await createAccount()
    const first = await issueChallenge(account)
    await issueChallenge(account)

    const response = await client.post('/auth/password/reset').json({
      token: first.token,
      password: 'Replacement-password-123',
    })

    response.assertStatus(422)

    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.equal(event.targetId, account.id)
    assert.equal(event.metadata.reason, 'SUPERSEDED')
    assert.equal(event.metadata.challengeId, first.challenge.id)
  })

  test('rejects a challenge after it has been redeemed', async ({ client, assert }) => {
    const { account } = await createAccount()
    const { challenge, token } = await issueChallenge(account)
    const payload = {
      token,
      password: 'Replacement-password-123',
    }

    const first = await client.post('/auth/password/reset').json(payload)
    const second = await client.post('/auth/password/reset').json(payload)

    first.assertStatus(200)
    second.assertStatus(422)

    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.equal(event.targetId, account.id)
    assert.equal(event.metadata.reason, 'ALREADY_REDEEMED')
    assert.equal(event.metadata.challengeId, challenge.id)
  })

  test('invalidates sessions created before a successful reset', async ({ client }) => {
    const { account } = await createAccount()
    const { token } = await issueChallenge(account)

    const reset = await client.post('/auth/password/reset').json({
      token,
      password: 'Replacement-password-123',
    })
    reset.assertStatus(200)

    await account.refresh()
    const current = await client
      .get('/auth/me')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': 1 })

    current.assertStatus(401)
  })

  test('rate limits repeated attempts for one reset token', async ({ client }) => {
    const payload = {
      token: 'same-invalid-token',
      password: 'Replacement-password-123',
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await client.post('/auth/password/reset').json(payload)
      response.assertStatus(422)
    }

    const limited = await client.post('/auth/password/reset').json(payload)
    limited.assertStatus(429)
  })
})
