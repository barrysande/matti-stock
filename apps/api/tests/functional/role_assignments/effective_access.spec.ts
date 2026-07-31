import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import EffectiveAccessService from '#services/effective_access_service'

async function createAccount() {
  const person = await Person.create({
    displayName: 'Scoped Operator',
    staffNumber: null,
    primaryEmail: 'scoped.operator@example.com',
    primaryEmailVerifiedAt: DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email: person.primaryEmail!,
    password: 'Effective-access-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createRole(name: string, permissionKeys: string[]) {
  const role = await Role.create({
    key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name,
    systemManaged: false,
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: `Create ${name}`,
    createdByAccountId: null,
  })
  await RoleVersionPermission.createMany(
    permissionKeys.map((permissionKey) => ({ roleVersionId: version.id, permissionKey }))
  )
  return { role, version }
}

async function createFixture() {
  await Permission.createMany([
    {
      key: 'stocktake.count',
      description: 'Submit an assigned stock-take count or recount',
      customRoleAssignable: true,
    },
    {
      key: 'stocktake.review',
      description: 'Review stock-take completion and verification exceptions',
      customRoleAssignable: true,
    },
  ])
  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const engineering = await OrganizationalUnit.create({
    name: 'Engineering',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const workshop = await OrganizationalUnit.create({
    name: 'Workshop',
    unitType: 'SUB_DEPARTMENT',
    parentId: engineering.id,
  })
  const finance = await OrganizationalUnit.create({
    name: 'Finance',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const account = await createAccount()
  const countRole = await createRole('Counter', ['stocktake.count'])
  const reviewRole = await createRole('Reviewer', ['stocktake.review'])

  return { account, countRole, engineering, finance, reviewRole, workshop }
}

async function createAssignment(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  roleVersionId: string,
  scopeOrgUnitId: string,
  scopeMode: 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS',
  startsAt = DateTime.now().minus({ minutes: 1 }),
  expiresAt: DateTime | null = null
) {
  return RoleAssignment.create({
    accountId: fixture.account.id,
    roleVersionId,
    scopeOrgUnitId,
    scopeMode,
    startsAt,
    expiresAt,
    grantedByAccountId: null,
    reason: 'Effective-access test grant',
  })
}

function cleanupTables() {
  return testUtils.db().truncate()
}

test.group('Role assignments effective access', (group) => {
  group.each.setup(cleanupTables)

  test('applies descendant scope without granting access to sibling departments', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const assignment = await createAssignment(
      fixture,
      fixture.countRole.version.id,
      fixture.engineering.id,
      'INCLUDE_DESCENDANTS'
    )
    const access = await app.container.make(EffectiveAccessService)

    const engineering = await access.authorize(
      fixture.account.id,
      'stocktake.count',
      fixture.engineering.id
    )
    const workshop = await access.authorize(
      fixture.account.id,
      'stocktake.count',
      fixture.workshop.id
    )
    const finance = await access.authorize(
      fixture.account.id,
      'stocktake.count',
      fixture.finance.id
    )

    assert.equal(engineering?.assignmentId, assignment.id)
    assert.equal(workshop?.assignmentId, assignment.id)
    assert.isNull(finance)
  })

  test('unions separate active grants while preserving their assignment authority context', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const count = await createAssignment(
      fixture,
      fixture.countRole.version.id,
      fixture.engineering.id,
      'THIS_NODE_ONLY'
    )
    const review = await createAssignment(
      fixture,
      fixture.reviewRole.version.id,
      fixture.engineering.id,
      'THIS_NODE_ONLY'
    )
    const access = await app.container.make(EffectiveAccessService)

    const grants = await access.grantsForAccount(fixture.account.id, fixture.engineering.id)

    assert.deepEqual(
      grants.map(({ assignmentId, permissionKey }) => ({ assignmentId, permissionKey })),
      [
        { assignmentId: count.id, permissionKey: 'stocktake.count' },
        { assignmentId: review.id, permissionKey: 'stocktake.review' },
      ].sort((left, right) => left.assignmentId.localeCompare(right.assignmentId))
    )
  })

  test('synchronously excludes future, expired, terminated, inactive-account, and archived grants', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const access = await app.container.make(EffectiveAccessService)
    const assignment = await createAssignment(
      fixture,
      fixture.countRole.version.id,
      fixture.engineering.id,
      'THIS_NODE_ONLY'
    )

    assert.isNotNull(
      await access.authorize(fixture.account.id, 'stocktake.count', fixture.engineering.id)
    )

    await RoleAssignmentTermination.create({
      assignmentId: assignment.id,
      kind: 'ENDED',
      effectiveAt: DateTime.now(),
      replacementAssignmentId: null,
      terminatedByAccountId: fixture.account.id,
      reason: 'End the grant',
    })
    assert.isNull(
      await access.authorize(fixture.account.id, 'stocktake.count', fixture.engineering.id)
    )

    const future = await createAssignment(
      fixture,
      fixture.reviewRole.version.id,
      fixture.engineering.id,
      'THIS_NODE_ONLY',
      DateTime.now().plus({ days: 1 })
    )
    assert.isNull(
      await access.authorize(fixture.account.id, 'stocktake.review', fixture.engineering.id)
    )

    await future
      .merge({
        startsAt: DateTime.now().minus({ days: 2 }),
        expiresAt: DateTime.now().minus({ days: 1 }),
      })
      .save()
    assert.isNull(
      await access.authorize(fixture.account.id, 'stocktake.review', fixture.engineering.id)
    )

    await createAssignment(
      fixture,
      fixture.countRole.version.id,
      fixture.engineering.id,
      'INCLUDE_DESCENDANTS'
    )
    assert.isNotNull(
      await access.authorize(fixture.account.id, 'stocktake.count', fixture.engineering.id)
    )

    await fixture.account.merge({ status: 'SUSPENDED' }).save()
    assert.isNull(
      await access.authorize(fixture.account.id, 'stocktake.count', fixture.engineering.id)
    )

    await fixture.account.merge({ status: 'ACTIVE' }).save()
    await fixture.countRole.role.merge({ archivedAt: DateTime.now() }).save()
    assert.isNull(
      await access.authorize(fixture.account.id, 'stocktake.count', fixture.engineering.id)
    )
  })
})
