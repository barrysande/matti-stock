import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import DuplicateException from '#exceptions/duplicate_exception'
import MasterAdminCredentialsNotification from '#mails/master_admin_credentials_notification'
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

  test('creates the scoped account and audit event atomically', async ({ assert }) => {
    await seedAccessRegistry()
    const service = await app.container.make(MasterAdminBootstrapService)
    const result = await service.run(data)

    const institute = await OrganizationalUnit.findByOrFail('name', data.instituteName)
    const account = await UserAccount.findByOrFail('email', data.masterEmail)
    const person = await Person.findOrFail(account.personId)
    const assignment = await RoleAssignment.findByOrFail('accountId', account.id)
    const event = await AccessEvent.findByOrFail('eventType', 'MASTER_ADMIN_BOOTSTRAPPED')

    assert.equal(person.displayName, data.masterName)
    assert.equal(person.primaryEmail, data.masterEmail)
    assert.equal(account.status, 'INVITED')
    assert.equal(assignment.scopeOrgUnitId, institute.id)
    assert.equal(assignment.scopeMode, 'INCLUDE_DESCENDANTS')
    assert.isNull(assignment.expiresAt)
    assert.equal(event.targetId, account.id)
    assert.equal(result.account.id, account.id)
    assert.equal(result.person.id, person.id)
    assert.equal(result.assignment.id, assignment.id)
    assert.isTrue(await hash.use('argon').verify(account.password, result.password))
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
    assert.equal(await countRows('access_events'), 1)
  })

  test('builds a credentials email without contacting SMTP', async () => {
    using fake = mail.fake()

    await mail.send(
      new MasterAdminCredentialsNotification(
        { name: data.masterName, email: data.masterEmail },
        'generated-password',
        'http://localhost:5173/login'
      )
    )

    fake.mails.assertSent(MasterAdminCredentialsNotification, ({ message }) => {
      return (
        message.hasTo(data.masterEmail) &&
        message.hasSubject('Your Matti Stock Master Admin account')
      )
    })
  })
})
