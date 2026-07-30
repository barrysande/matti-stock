import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { QueueManager } from '@adonisjs/queue'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
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
import SendPasswordCredentialEmail from '#jobs/send_password_credential_email'
import AccountCredentialAdministrationService from '#services/account_credential_administration_service'
import PasswordChallengeService from '#services/password_challenge_service'

const reason = { reason: 'Approved administrative credential recovery' }

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

async function createRootActor() {
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
    reason: 'Test administrative credential recovery authority',
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
  const { account } = await createAccount({ email: 'master@example.com' })
  const assignment = await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Test administrative credential recovery authority',
  })

  return { account, assignment }
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

test.group('Administrative account credential recovery', (group) => {
  group.each.setup(cleanupAccessTables)

  group.each.teardown(() => {
    QueueManager.restore()
    Reflect.deleteProperty(SendPasswordCredentialEmail, 'dispatch')
  })

  test('queues an audited reset challenge for a verified account', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'holder@example.com' })

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    response.assertBody({
      message: 'Account credential recovery email has been queued.',
    })

    await account.refresh()
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    const event = await AccessEvent.findByOrFail('eventType', 'PASSWORD_RESET_REQUESTED')
    const queued = fake.getPushedJobsOn('emails')

    assert.equal(challenge.purpose, 'RESET')
    assert.equal(Number(challenge.resetVersion), 1)
    assert.equal(Number(account.credentialVersion), 1)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.equal(event.actorType, 'ACCOUNT')
    assert.equal(event.actorAccountId, actor.id)
    assert.equal(event.targetId, account.id)
    assert.equal(event.reason, reason.reason)
    assert.equal(event.metadata.challengeId, challenge.id)
    assert.equal(event.metadata.purpose, 'RESET')
    assert.deepEqual(
      queued.map(({ job }) => job.payload),
      [{ challengeId: challenge.id }]
    )
    assert.deepEqual(Object.keys(response.body()), ['message'])
  })

  test('allows recovery for a suspended verified account without restoring it', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'suspended@example.com',
      status: 'SUSPENDED',
    })

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    await account.refresh()
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    assert.equal(account.status, 'SUSPENDED')
    assert.equal(challenge.purpose, 'RESET')
    fake.assertPushedCount(1, { queue: 'emails' })
  })

  test('replaces setup for an unverified account and supersedes its previous link', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'invited@example.com',
      status: 'INVITED',
      verified: false,
    })
    const passwordChallenges = await app.container.make(PasswordChallengeService)
    const previous = await passwordChallenges.request(
      { email: account.email },
      { ip: '127.0.0.1', requestId: 'previous-setup-link' }
    )

    if (!previous) {
      throw new Error('Expected an initial setup challenge')
    }

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    await account.refresh()
    const replacement = await PasswordResetChallenge.query()
      .where('account_id', account.id)
      .where('reset_version', Number(account.passwordResetVersion))
      .firstOrFail()

    assert.equal(previous.purpose, 'INITIAL_SETUP')
    assert.equal(replacement.purpose, 'INITIAL_SETUP')
    assert.equal(Number(previous.resetVersion), 1)
    assert.equal(Number(replacement.resetVersion), 2)
    assert.equal(Number(account.passwordResetVersion), 2)
    assert.isNotNull(
      await AccessEvent.query()
        .where('event_type', 'PASSWORD_SETUP_REQUESTED')
        .where('actor_account_id', actor.id)
        .first()
    )
    fake.assertPushedCount(1, { queue: 'emails' })
  })

  test('allows a root administrator to send their own recovery link', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()

    const response = await client
      .post(`/accounts/${actor.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', actor.id)
    assert.equal(challenge.purpose, 'RESET')
    fake.assertPushedCount(1, { queue: 'emails' })
  })

  test('rejects anonymous and non-root requests before validating the reason', async ({
    client,
    assert,
  }) => {
    const targetId = randomUUID()
    const anonymous = await client.post(`/accounts/${targetId}/password-reset`).json({ reason: '' })
    anonymous.assertStatus(401)

    const { account } = await createAccount({ email: 'ordinary@example.com' })
    const denied = await client
      .post(`/accounts/${targetId}/password-reset`)
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
      .json({ reason: '' })
    denied.assertStatus(403)

    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('validates the administrative reason before issuing a challenge', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'invalid-reason@example.com' })

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json({ reason: '' })

    response.assertStatus(422)
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
    fake.assertNothingPushed()
  })

  test('returns not found for an unknown account', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()

    const response = await client
      .post(`/accounts/${randomUUID()}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(404)
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
    fake.assertNothingPushed()
  })

  test('rejects recovery for a deactivated account', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({
      email: 'deactivated@example.com',
      status: 'DEACTIVATED',
    })

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(409)
    response.assertBodyContains({
      code: 'E_ACCOUNT_CREDENTIAL_RECOVERY_UNAVAILABLE',
    })
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
    fake.assertNothingPushed()
  })

  test('revalidates root authority inside the transaction', async ({ assert }) => {
    const { account: actor, assignment } = await createRootActor()
    const { account } = await createAccount({ email: 'authority-changed@example.com' })
    const service = await app.container.make(AccountCredentialAdministrationService)
    await assignment.delete()

    try {
      await service.requestPasswordReset(account.id, reason, actor.id)
      assert.fail('Expected changed root authority to reject credential recovery')
    } catch (error) {
      assert.instanceOf(error, AccessAuthorityChangedException)
    }

    await account.refresh()
    assert.equal(Number(account.passwordResetVersion), 0)
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
  })

  test('keeps recovery committed when email delivery cannot be queued', async ({
    client,
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'queue-failure@example.com' })

    Reflect.defineProperty(SendPasswordCredentialEmail, 'dispatch', {
      configurable: true,
      value: async () => {
        throw new Error('Queue unavailable')
      },
    })

    const response = await client
      .post(`/accounts/${account.id}/password-reset`)
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(reason)

    response.assertStatus(200)
    response.assertBody({
      message: 'Account credential recovery requested, but the email could not be queued.',
    })
    assert.isNotNull(await PasswordResetChallenge.findBy('accountId', account.id))
    assert.isNotNull(await AccessEvent.findBy('eventType', 'PASSWORD_RESET_REQUESTED'))
  })

  test('rolls back the challenge and version when its audit context is invalid', async ({
    assert,
  }) => {
    const { account: actor } = await createRootActor()
    const { account } = await createAccount({ email: 'atomicity@example.com' })
    const service = await app.container.make(AccountCredentialAdministrationService)

    await assert.rejects(() =>
      service.requestPasswordReset(account.id, reason, actor.id, {
        ip: 'not-an-ip-address',
        requestId: 'administrative-recovery-atomicity',
      })
    )

    await account.refresh()
    assert.equal(Number(account.passwordResetVersion), 0)
    assert.lengthOf(await PasswordResetChallenge.all(), 0)
    assert.lengthOf(await AccessEvent.all(), 0)
  })
})
