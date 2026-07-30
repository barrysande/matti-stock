import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import PasswordResetChallenge from '#models/password_reset_challenge'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import LastRootAccessException from '#exceptions/last_root_access_exception'
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import AccountLifecycleService from '#services/account_lifecycle_service'
import PasswordChallengeService from '#services/password_challenge_service'

const reason = { reason: 'Approved account lifecycle administration' }

interface AccountOptions {
  email: string
  status?: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
  verified?: boolean
}

async function createAccount(options: AccountOptions) {
  const person = await Person.create({
    displayName: options.email.split('@')[0],
    staffNumber: null,
    primaryEmail: options.email,
    primaryEmailVerifiedAt: options.verified === false ? null : DateTime.now(),
  })
  const account = await UserAccount.create({
    personId: person.id,
    email: options.email,
    password: 'Current-password-123',
    status: options.status ?? 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })

  return { account, person }
}

async function createAccessRegistry() {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const role = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
    archivedAt: null,
  })
  const roleVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Test account lifecycle authority',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: roleVersion.id,
    permissionKey: permission.key,
  })
  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })

  return { institute, roleVersion }
}

async function grantRoot(
  account: UserAccount,
  registry: Awaited<ReturnType<typeof createAccessRegistry>>
) {
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: registry.roleVersion.id,
    scopeOrgUnitId: registry.institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Test account lifecycle authority',
  })
}

async function createRootActor(
  email = 'master@example.com',
  registry?: Awaited<ReturnType<typeof createAccessRegistry>>
) {
  const accessRegistry = registry ?? (await createAccessRegistry())
  const { account } = await createAccount({ email })
  await grantRoot(account, accessRegistry)
  return { account, registry: accessRegistry }
}

async function cleanupAccessTables() {
  const tables = [
    'password_reset_redemptions',
    'password_reset_challenges',
    'access_events',
    'role_assignments',
    'role_version_permissions',
    'role_versions',
    'roles',
    'user_accounts',
    'people',
    'organizational_units',
    'permissions',
  ]

  for (const table of tables) {
    await db.from(table).delete()
  }
}

test.group('Account lifecycle administration', (group) => {
  group.each.setup(cleanupAccessTables)

  group.each.teardown(() => {
    QueueManager.restore()
  })

  test('suspends and restores an account with exact messages, versions, and audit history', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'holder@example.com' })

    const suspended = await client
      .post(`/accounts/${account.id}/suspend`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    suspended.assertStatus(200)
    suspended.assertBody({ message: 'Account suspended.' })

    await account.refresh()
    assert.equal(account.status, 'SUSPENDED')
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 1)

    const suspension = await AccessEvent.findByOrFail('eventType', 'ACCOUNT_SUSPENDED')
    assert.equal(suspension.actorAccountId, actor.id)
    assert.equal(suspension.targetId, account.id)
    assert.equal(suspension.reason, reason.reason)
    assert.equal(suspension.metadata.previousStatus, 'ACTIVE')
    assert.equal(suspension.metadata.status, 'SUSPENDED')
    assert.equal(suspension.metadata.previousCredentialVersion, 1)
    assert.equal(suspension.metadata.credentialVersion, 2)
    assert.equal(suspension.metadata.previousPasswordResetVersion, 0)
    assert.equal(suspension.metadata.passwordResetVersion, 1)

    const restored = await client
      .post(`/accounts/${account.id}/restore`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    restored.assertStatus(200)
    restored.assertBody({ message: 'Account restored.' })

    await account.refresh()
    assert.equal(account.status, 'ACTIVE')
    assert.equal(Number(account.credentialVersion), 3)
    assert.equal(Number(account.passwordResetVersion), 2)
    assert.isNotNull(await AccessEvent.findBy('eventType', 'ACCOUNT_SUSPENSION_ENDED'))
    assert.deepEqual(Object.keys(restored.body()), ['message'])
  })

  test('deactivates invited, active, and suspended accounts', async ({ client, assert }) => {
    const { account: actor } = await createRootActor()
    const accounts = await Promise.all([
      createAccount({ email: 'invited@example.com', status: 'INVITED', verified: false }),
      createAccount({ email: 'active@example.com' }),
      createAccount({ email: 'suspended@example.com', status: 'SUSPENDED' }),
    ])

    for (const { account } of accounts) {
      const response = await client
        .post(`/accounts/${account.id}/deactivate`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)

      response.assertStatus(200)
      response.assertBody({ message: 'Account deactivated.' })
      await account.refresh()
      assert.equal(account.status, 'DEACTIVATED')
      assert.equal(Number(account.credentialVersion), 2)
      assert.equal(Number(account.passwordResetVersion), 1)
    }

    assert.lengthOf(
      await AccessEvent.query().where('event_type', 'ACCOUNT_DEACTIVATED'),
      accounts.length
    )
  })

  test('reactivates a verified account without credential delivery', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'verified@example.com',
      status: 'DEACTIVATED',
    })

    const response = await client
      .post(`/accounts/${account.id}/reactivate`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    response.assertBody({ message: 'Account reactivated.' })
    fake.assertNothingPushed()

    await account.refresh()
    assert.equal(account.status, 'ACTIVE')
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.lengthOf(await PasswordResetChallenge.query().where('account_id', account.id), 0)
  })

  test('reactivates an unverified account as invited with a fresh setup challenge', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'unverified@example.com',
      status: 'DEACTIVATED',
      verified: false,
    })

    const response = await client
      .post(`/accounts/${account.id}/reactivate`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    response.assertBody({
      message: 'Account reactivated. A password-setting link has been queued.',
    })

    await account.refresh()
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    const event = await AccessEvent.findByOrFail('eventType', 'ACCOUNT_REACTIVATED')

    assert.equal(account.status, 'INVITED')
    assert.equal(Number(account.credentialVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.equal(challenge.purpose, 'INITIAL_SETUP')
    assert.equal(event.metadata.previousStatus, 'DEACTIVATED')
    assert.equal(event.metadata.status, 'INVITED')
    assert.equal(event.metadata.challengeId, challenge.id)
    assert.equal(event.metadata.challengePurpose, 'INITIAL_SETUP')
    fake.assertPushedCount(1, { queue: 'emails' })
    assert.deepEqual(Object.keys(response.body()), ['message'])
    assert.notInclude(JSON.stringify(response.body()), 'challenge')
  })

  test('rejects anonymous lifecycle requests before changing the target', async ({
    client,
    assert,
  }) => {
    const id = randomUUID()

    for (const action of ['suspend', 'restore', 'deactivate', 'reactivate']) {
      const response = await client.post(`/accounts/${id}/${action}`).json(reason)
      response.assertStatus(401)
    }

    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('denies every lifecycle action without effective access.root', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createAccount({ email: 'ordinary@example.com' })
    const targets = {
      suspend: await createAccount({ email: 'suspend@example.com' }),
      restore: await createAccount({ email: 'restore@example.com', status: 'SUSPENDED' }),
      deactivate: await createAccount({ email: 'deactivate@example.com' }),
      reactivate: await createAccount({
        email: 'reactivate@example.com',
        status: 'DEACTIVATED',
      }),
    }

    for (const [action, target] of Object.entries(targets)) {
      const response = await client
        .post(`/accounts/${target.account.id}/${action}`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)

      response.assertStatus(403)
    }

    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('rejects invalid transitions with stable application errors', async ({ client }) => {
    const { account: actor } = await createRootActor()
    const cases = [
      {
        action: 'suspend',
        target: await createAccount({
          email: 'already-suspended@example.com',
          status: 'SUSPENDED',
        }),
        previousStatus: 'SUSPENDED',
      },
      {
        action: 'restore',
        target: await createAccount({ email: 'already-active@example.com' }),
        previousStatus: 'ACTIVE',
      },
      {
        action: 'deactivate',
        target: await createAccount({
          email: 'already-deactivated@example.com',
          status: 'DEACTIVATED',
        }),
        previousStatus: 'DEACTIVATED',
      },
      {
        action: 'reactivate',
        target: await createAccount({ email: 'not-deactivated@example.com' }),
        previousStatus: 'ACTIVE',
      },
    ]

    for (const item of cases) {
      const response = await client
        .post(`/accounts/${item.target.account.id}/${item.action}`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)

      response.assertStatus(409)
      response.assertBodyContains({ code: 'E_INVALID_ACCOUNT_TRANSITION' })
      await item.target.account.refresh()
      response.assertBodyContains({
        message: `Cannot perform this account lifecycle transition from ${item.previousStatus}.`,
      })
    }
  })

  test('rejects missing target accounts and missing reasons', async ({ client, assert }) => {
    const { account: actor } = await createRootActor()

    for (const action of ['suspend', 'restore', 'deactivate', 'reactivate']) {
      const missing = await client
        .post(`/accounts/${randomUUID()}/${action}`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)
      missing.assertStatus(404)
    }

    const { account } = await createAccount({ email: 'validation@example.com' })
    const invalid = await client
      .post(`/accounts/${account.id}/suspend`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json({ reason: '' })

    invalid.assertStatus(422)
    await account.refresh()
    assert.equal(account.status, 'ACTIVE')
    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('prevents self-suspension and self-deactivation', async ({ client, assert }) => {
    const { account: actor } = await createRootActor()

    for (const action of ['suspend', 'deactivate']) {
      const response = await client
        .post(`/accounts/${actor.id}/${action}`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)

      response.assertStatus(409)
      response.assertBodyContains({
        code: 'E_ACCOUNT_SELF_ADMINISTRATION',
        message: 'You cannot suspend or deactivate your own account.',
      })
    }

    await actor.refresh()
    assert.equal(actor.status, 'ACTIVE')
    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('serializes concurrent root changes and preserves one effective root', async ({
    assert,
  }) => {
    const registry = await createAccessRegistry()
    const { account: first } = await createRootActor('first-root@example.com', registry)
    const { account: second } = await createRootActor('second-root@example.com', registry)
    const service = await app.container.make(AccountLifecycleService)

    const results = await Promise.allSettled([
      service.suspend(second.id, reason, first.id),
      service.suspend(first.id, reason, second.id),
    ])
    const rejected = results.find((result) => result.status === 'rejected')

    assert.lengthOf(
      results.filter((result) => result.status === 'fulfilled'),
      1
    )
    assert.instanceOf(
      rejected?.status === 'rejected' ? rejected.reason : null,
      LastRootAccessException
    )

    await first.refresh()
    await second.refresh()
    assert.lengthOf(
      [first, second].filter((account) => account.status === 'ACTIVE'),
      1
    )
    assert.lengthOf(await AccessEvent.query().where('event_type', 'ACCOUNT_SUSPENDED'), 1)
  })

  test('invalidates stale sessions and supersedes credential challenges', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'session-holder@example.com' })
    const passwordChallenges = await app.container.make(PasswordChallengeService)
    const challenge = await passwordChallenges.request(
      { email: account.email },
      { ip: '127.0.0.1', requestId: 'lifecycle-supersession' }
    )

    if (!challenge) {
      throw new Error('Expected a password reset challenge')
    }

    const token = passwordChallenges.createToken(challenge)
    const response = await client
      .post(`/accounts/${account.id}/suspend`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)
    response.assertStatus(200)

    const staleSession = await client
      .get('/auth/me')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': 1 })
    staleSession.assertStatus(401)

    const staleChallenge = await client.post('/auth/password/reset').json({
      token,
      password: 'Replacement-password-123',
    })
    staleChallenge.assertStatus(422)

    const rejection = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REJECTED')
    assert.equal(rejection.metadata.reason, 'SUPERSEDED')
    assert.isNotNull(await AccessEvent.findBy('eventType', 'SESSION_INVALIDATED'))
  })

  test('keeps reactivation committed when setup delivery cannot be queued', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'queue-failure@example.com',
      status: 'DEACTIVATED',
      verified: false,
    })

    Reflect.defineProperty(SendPasswordCredentialEmail, 'dispatch', {
      configurable: true,
      value: async () => {
        throw new Error('Queue unavailable')
      },
    })

    try {
      const response = await client
        .post(`/accounts/${account.id}/reactivate`)
        .loginAs(actor)
        .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
        .json(reason)

      response.assertStatus(200)
      response.assertBody({
        message: 'Account reactivated, but the password-setting email could not be queued.',
      })
    } finally {
      Reflect.deleteProperty(SendPasswordCredentialEmail, 'dispatch')
    }

    await account.refresh()
    assert.equal(account.status, 'INVITED')
    assert.isNotNull(await PasswordResetChallenge.findBy('accountId', account.id))
    assert.isNotNull(await AccessEvent.findBy('eventType', 'ACCOUNT_REACTIVATED'))
  })

  test('rolls back the account mutation when its audit write fails', async ({ assert }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'atomicity@example.com' })
    const service = await app.container.make(AccountLifecycleService)

    await assert.rejects(() =>
      service.suspend(account.id, reason, actor.id, {
        ip: 'not-an-ip-address',
        requestId: 'lifecycle-atomicity',
      })
    )

    await account.refresh()
    assert.equal(account.status, 'ACTIVE')
    assert.equal(Number(account.credentialVersion), 1)
    assert.equal(Number(account.passwordResetVersion), 0)
    assert.isNull(await AccessEvent.findBy('eventType', 'ACCOUNT_SUSPENDED'))
  })
})
