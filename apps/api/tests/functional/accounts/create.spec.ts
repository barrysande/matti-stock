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

const payload = {
  displayName: 'New Account Holder',
  staffNumber: 'STAFF-001',
  email: 'new.account@example.com',
  reason: 'Approved access onboarding',
}

async function createAccount(email: string) {
  const person = await Person.create({
    displayName: 'Access Administrator',
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  const account = await UserAccount.create({
    personId: person.id,
    email,
    password: 'Administrator-password-123',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })

  return { account, person }
}

async function createMasterAdmin() {
  const { account } = await createAccount('master@example.com')
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
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
    reason: 'Test account creation authority',
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
  await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Test account creation authority',
  })

  return account
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

async function countRows(table: string) {
  const [{ total }] = await db.from(table).count('* as total')
  return Number(total)
}

test.group('Account creation', (group) => {
  group.each.setup(cleanupAccessTables)

  group.each.teardown(() => {
    QueueManager.restore()
  })

  test('creates an invited account with an undisclosed credential and queues its setup link', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const actor = await createMasterAdmin()

    const response = await client
      .post('/accounts')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(payload)

    response.assertStatus(201)
    response.assertBody({
      message: 'Account created. A password-setting link has been queued.',
    })

    const account = await UserAccount.findByOrFail('email', payload.email)
    const person = await Person.findOrFail(account.personId)
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    const created = await AccessEvent.findByOrFail('eventType', 'ACCOUNT_CREATED')
    const setupRequested = await AccessEvent.findByOrFail('eventType', 'PASSWORD_SETUP_REQUESTED')

    assert.equal(person.displayName, payload.displayName)
    assert.equal(person.staffNumber, payload.staffNumber)
    assert.isNull(person.primaryEmailVerifiedAt)
    assert.equal(account.status, 'INVITED')
    assert.isNotNull(account.password)
    assert.isNull(account.lastLoginAt)
    assert.equal(Number(account.credentialVersion), 1)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.equal(challenge.purpose, 'INITIAL_SETUP')
    assert.equal(created.actorAccountId, actor.id)
    assert.equal(created.targetId, account.id)
    assert.equal(created.reason, payload.reason)
    assert.equal(created.metadata.challengeId, challenge.id)
    assert.equal(setupRequested.targetId, account.id)
    assert.notInclude(JSON.stringify(response.body()), 'password')
    assert.notInclude(JSON.stringify(created.metadata), 'password')
    assert.notInclude(JSON.stringify(setupRequested.metadata), 'password')
    fake.assertPushedCount(1, { queue: 'emails' })

    const current = await client
      .get('/auth/me')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
    current.assertStatus(200)
    current.assertBodyContains({ data: { account: { id: actor.id } } })
  })

  test('rejects anonymous creation before creating or queuing anything', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()

    const response = await client.post('/accounts').json(payload)

    response.assertStatus(401)
    assert.equal(await countRows('people'), 0)
    assert.equal(await countRows('user_accounts'), 0)
    assert.equal(await countRows('password_reset_challenges'), 0)
    assert.equal(await countRows('access_events'), 0)
    fake.assertNothingPushed()
  })

  test('denies an authenticated account without access.root', async ({ client, assert }) => {
    const fake = QueueManager.fake()
    const { account } = await createAccount('ordinary@example.com')

    const response = await client
      .post('/accounts')
      .loginAs(account)
      .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
      .json(payload)

    response.assertStatus(403)
    assert.equal(await countRows('people'), 1)
    assert.equal(await countRows('user_accounts'), 1)
    assert.equal(await countRows('password_reset_challenges'), 0)
    assert.equal(await countRows('access_events'), 0)
    fake.assertNothingPushed()
  })

  test('rejects invalid input before creating or queuing an account', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const actor = await createMasterAdmin()

    const response = await client
      .post('/accounts')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json({ ...payload, displayName: '', email: 'not-an-email', reason: '' })

    response.assertStatus(422)
    assert.equal(await countRows('user_accounts'), 1)
    assert.equal(await countRows('password_reset_challenges'), 0)
    assert.equal(await countRows('access_events'), 0)
    fake.assertNothingPushed()
  })

  test('translates a duplicate account email and rolls back the whole creation', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const actor = await createMasterAdmin()
    const existingPerson = await Person.create({
      displayName: 'Existing Account Holder',
      staffNumber: null,
      primaryEmail: null,
      primaryEmailVerifiedAt: null,
    })
    await UserAccount.create({
      personId: existingPerson.id,
      email: payload.email,
      password: 'Existing-password-123',
      status: 'ACTIVE',
      credentialVersion: 1,
      passwordResetVersion: 0,
    })

    const duplicate = await client
      .post('/accounts')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(payload)

    duplicate.assertStatus(409)
    duplicate.assertBodyContains({
      code: 'E_DUPLICATE',
      message: 'An account with this email or staff number already exists',
    })
    assert.equal(await countRows('people'), 2)
    assert.equal(await countRows('user_accounts'), 2)
    assert.equal(await countRows('password_reset_challenges'), 0)
    assert.equal(await countRows('access_events'), 0)
    fake.assertNothingPushed()
  })

  test('translates a duplicate staff number without leaving partial records', async ({
    client,
    assert,
  }) => {
    const fake = QueueManager.fake()
    const actor = await createMasterAdmin()
    const first = await client
      .post('/accounts')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json(payload)
    first.assertStatus(201)

    const duplicate = await client
      .post('/accounts')
      .loginAs(actor)
      .withSession({ 'auth.credentialVersion': Number(actor.credentialVersion) })
      .json({ ...payload, email: 'different@example.com' })

    duplicate.assertStatus(409)
    duplicate.assertBodyContains({
      code: 'E_DUPLICATE',
      message: 'An account with this email or staff number already exists',
    })
    assert.equal(await countRows('people'), 2)
    assert.equal(await countRows('user_accounts'), 2)
    assert.equal(await countRows('password_reset_challenges'), 1)
    assert.equal(await countRows('access_events'), 2)
    fake.assertPushedCount(1, { queue: 'emails' })
  })
})
