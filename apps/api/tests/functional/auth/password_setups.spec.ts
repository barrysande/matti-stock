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
import PasswordCredentialService from '#services/password_credential_service'

const TEMPORARY_PASSWORD = 'Undisclosed-temporary-1'

async function createInvitedAccount() {
  const person = await Person.create({
    displayName: 'Invited Account',
    staffNumber: null,
    primaryEmail: 'invited@example.com',
    primaryEmailVerifiedAt: null,
  })
  const account = await UserAccount.create({
    personId: person.id,
    email: person.primaryEmail!,
    password: TEMPORARY_PASSWORD,
    status: 'INVITED',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })

  return { account, person }
}

async function issueSetup(account: UserAccount) {
  const service = await app.container.make(PasswordCredentialService)
  const challenge = await service.request(
    { email: account.email },
    { ip: '127.0.0.1', requestId: 'password-setup-test' }
  )

  if (!challenge) {
    throw new Error('Expected password setup challenge to be created')
  }

  return { challenge, service, token: service.createToken(challenge) }
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

test.group('Password setup', (group) => {
  group.each.setup(async () => {
    await cleanupAccountTables()
    await limiter.clear(['memory'])
  })

  group.each.teardown(() => {
    QueueManager.restore()
  })

  test('forgot-password recovery queues a fresh setup challenge for an unverified account', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account } = await createInvitedAccount()

    const response = await client.post('/auth/password/forgot').json({ email: account.email })

    response.assertStatus(200)
    response.assertBody({
      message: 'If an account uses that email, a password reset link will be sent.',
    })
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    assert.equal(challenge.purpose, 'INITIAL_SETUP')
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_SETUP_REQUESTED'))
    fake.assertPushedCount(1, { queue: 'emails' })
  })

  test('sets a password through a current single-use setup challenge', async ({
    client,
    assert,
  }) => {
    const { account, person } = await createInvitedAccount()
    const { challenge, token } = await issueSetup(account)

    const response = await client.post('/auth/password/set').json({
      token,
      password: 'Chosen-password-123',
    })

    response.assertStatus(200)
    response.assertBody({
      message: 'Password set successfully. Sign in with your new password.',
    })

    await account.refresh()
    await person.refresh()
    const redemption = await PasswordResetRedemption.findByOrFail('challengeId', challenge.id)
    assert.equal(redemption.accountId, account.id)
    assert.isTrue(await hash.use('argon').verify(account.password!, 'Chosen-password-123'))
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 2)
    assert.equal(account.status, 'INVITED')
    assert.isNotNull(person.primaryEmailVerifiedAt)
    assert.isNotNull(await AccessEvent.findBy('eventType', 'ACCOUNT_PASSWORD_SET'))

    const current = await client.get('/auth/me')
    current.assertStatus(401)
  })

  test('rejects validation failures without redeeming the challenge', async ({
    client,
    assert,
  }) => {
    const { account } = await createInvitedAccount()
    const { challenge, token } = await issueSetup(account)

    const response = await client.post('/auth/password/set').json({
      token,
      password: 'short',
    })

    response.assertStatus(422)
    assert.isNull(await PasswordResetRedemption.find(challenge.id))
    await account.refresh()
    assert.isTrue(await hash.use('argon').verify(account.password!, TEMPORARY_PASSWORD))
  })

  test('rejects an expired setup challenge', async ({ client, assert }) => {
    const { account } = await createInvitedAccount()
    const { challenge, token } = await issueSetup(account)
    challenge.createdAt = DateTime.now().minus({ hours: 2 })
    challenge.expiresAt = DateTime.now().minus({ hours: 1 })
    await challenge.save()

    const response = await client.post('/auth/password/set').json({
      token,
      password: 'Chosen-password-123',
    })

    response.assertStatus(422)
    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_SETUP_REJECTED')
    assert.equal(event.metadata.reason, 'EXPIRED')
  })

  test('rejects a setup challenge superseded by a later request', async ({ client, assert }) => {
    const { account } = await createInvitedAccount()
    const first = await issueSetup(account)
    await issueSetup(account)

    const response = await client.post('/auth/password/set').json({
      token: first.token,
      password: 'Chosen-password-123',
    })

    response.assertStatus(422)
    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_SETUP_REJECTED')
    assert.equal(event.metadata.reason, 'SUPERSEDED')
  })

  test('rejects a setup challenge after it has been redeemed', async ({ client, assert }) => {
    const { account } = await createInvitedAccount()
    const { challenge, token } = await issueSetup(account)
    const payload = { token, password: 'Chosen-password-123' }

    const first = await client.post('/auth/password/set').json(payload)
    const second = await client.post('/auth/password/set').json(payload)

    first.assertStatus(200)
    second.assertStatus(422)
    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_SETUP_REJECTED')
    assert.equal(event.metadata.reason, 'ALREADY_REDEEMED')
    assert.equal(event.metadata.challengeId, challenge.id)
  })

  test('rejects a setup challenge at the reset endpoint', async ({ client, assert }) => {
    const { account } = await createInvitedAccount()
    const { token } = await issueSetup(account)

    const response = await client.post('/auth/password/reset').json({
      token,
      password: 'Chosen-password-123',
    })

    response.assertStatus(422)
    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.equal(event.metadata.reason, 'WRONG_PURPOSE')
    await account.refresh()
    assert.isTrue(await hash.use('argon').verify(account.password!, TEMPORARY_PASSWORD))
  })

  test('rate limits repeated attempts for one setup token', async ({ client }) => {
    const payload = {
      token: 'same-invalid-token',
      password: 'Chosen-password-123',
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await client.post('/auth/password/set').json(payload)
      response.assertStatus(422)
    }

    const limited = await client.post('/auth/password/set').json(payload)
    limited.assertStatus(429)
  })
})
