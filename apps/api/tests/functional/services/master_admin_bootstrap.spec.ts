import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import DuplicateException from '#exceptions/duplicate_exception'
import AccountPasswordSetupMail from '#mails/account_password_setup_mail'
import PasswordResetChallenge from '#models/password_reset_challenge'
import MasterAdminBootstrapService from '#services/master_admin_bootstrap_service'

const data = {
  instituteName: 'Matti Institute',
  masterName: 'Master Administrator',
  masterEmail: 'master@example.com',
}

async function seedAccessRegistry(options: { archived?: boolean; grantAccessRoot?: boolean } = {}) {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const role = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
    archivedAt: options.archived ? DateTime.now() : null,
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Test access root',
    createdByAccountId: null,
  })

  if (options.grantAccessRoot !== false) {
    await RoleVersionPermission.create({
      roleVersionId: version.id,
      permissionKey: permission.key,
    })
  }
}

async function countRows(table: string) {
  const [{ total }] = await db.from(table).count('* as total')
  return Number(total)
}

async function captureError(callback: () => Promise<unknown>) {
  try {
    await callback()
  } catch (error) {
    return error
  }

  throw new Error('Expected the operation to fail')
}

async function cleanupBootstrapTables() {
  const tables = [
    'password_reset_redemptions',
    'password_reset_challenges',
    'access_events',
    'role_assignments',
    'role_version_permissions',
    'role_versions',
    'roles',
    'organizational_unit_versions',
    'user_accounts',
    'people',
    'organizational_units',
    'permissions',
  ]

  for (const table of tables) {
    await db.from(table).delete()
  }
}

test.group('Master Admin bootstrap service', (group) => {
  group.each.setup(cleanupBootstrapTables)

  test('creates the scoped account, setup challenge, and audit history atomically', async ({
    assert,
  }) => {
    await seedAccessRegistry()
    const service = await app.container.make(MasterAdminBootstrapService)
    const result = await service.run(data)

    const institute = await OrganizationalUnit.findByOrFail('name', data.instituteName)
    const instituteVersion = await OrganizationalUnitVersion.findByOrFail(
      'organizationalUnitId',
      institute.id
    )
    const account = await UserAccount.findByOrFail('email', data.masterEmail)
    const person = await Person.findOrFail(account.personId)
    const assignment = await RoleAssignment.findByOrFail('accountId', account.id)
    const challenge = await PasswordResetChallenge.findByOrFail('accountId', account.id)
    const event = await AccessEvent.findByOrFail('eventType', 'MASTER_ADMIN_BOOTSTRAPPED')
    const setupRequested = await AccessEvent.findByOrFail('eventType', 'PASSWORD_SETUP_REQUESTED')

    assert.equal(person.displayName, data.masterName)
    assert.equal(person.primaryEmail, data.masterEmail)
    assert.isNull(person.primaryEmailVerifiedAt)
    assert.equal(account.status, 'INVITED')
    assert.isNotNull(account.password)
    assert.equal(Number(account.passwordResetVersion), 1)
    assert.equal(challenge.purpose, 'INITIAL_SETUP')
    assert.equal(assignment.scopeOrgUnitId, institute.id)
    assert.equal(Number(instituteVersion.version), 1)
    assert.equal(instituteVersion.reason, 'Deployment-created institute root')
    assert.isNull(instituteVersion.changedByAccountId)
    assert.equal(assignment.scopeMode, 'INCLUDE_DESCENDANTS')
    assert.isNull(assignment.expiresAt)
    assert.equal(event.targetId, account.id)
    assert.equal(setupRequested.targetId, account.id)
    assert.notInclude(JSON.stringify(event.metadata), 'password')
    assert.notInclude(JSON.stringify(setupRequested.metadata), 'password')
    assert.equal(result.account.id, account.id)
    assert.equal(result.person.id, person.id)
    assert.equal(result.assignment.id, assignment.id)
    assert.equal(result.challenge.id, challenge.id)
  })

  test('rejects an archived Master Admin role before creating bootstrap records', async ({
    assert,
  }) => {
    await seedAccessRegistry({ archived: true })
    const service = await app.container.make(MasterAdminBootstrapService)

    const error = await captureError(() => service.run(data))

    assert.equal(
      (error as Error).message,
      'The active MASTER_ADMIN role is missing from the access registry'
    )
    assert.equal(await countRows('people'), 0)
    assert.equal(await countRows('organizational_units'), 0)
  })

  test('rejects a Master Admin role without access.root', async ({ assert }) => {
    await seedAccessRegistry({ grantAccessRoot: false })
    const service = await app.container.make(MasterAdminBootstrapService)

    const error = await captureError(() => service.run(data))

    assert.equal((error as Error).message, 'MASTER_ADMIN version 1 does not grant access.root')
    assert.equal(await countRows('people'), 0)
  })

  test('rolls back a duplicate bootstrap attempt', async ({ assert }) => {
    await seedAccessRegistry()
    const service = await app.container.make(MasterAdminBootstrapService)
    await service.run(data)

    const error = await captureError(() => service.run(data))

    assert.instanceOf(error, DuplicateException)
    assert.equal((error as Error).message, 'The Master Admin bootstrap identity already exists')
    assert.equal(await countRows('people'), 1)
    assert.equal(await countRows('user_accounts'), 1)
    assert.equal(await countRows('role_assignments'), 1)
    assert.equal(await countRows('organizational_unit_versions'), 1)
    assert.equal(await countRows('access_events'), 2)
  })

  test('builds a password setup email without contacting SMTP', async () => {
    using fake = mail.fake()

    await mail.send(
      new AccountPasswordSetupMail(
        { name: data.masterName, email: data.masterEmail },
        'http://localhost:5173/set-password?token=encrypted'
      )
    )

    fake.mails.assertSent(AccountPasswordSetupMail, ({ message }) => {
      return message.hasTo(data.masterEmail) && message.hasSubject('Set your Matti Stock password')
    })
  })
})
