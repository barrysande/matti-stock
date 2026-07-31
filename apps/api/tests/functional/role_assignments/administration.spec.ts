import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import InvalidRoleAssignmentChangeException from '#exceptions/invalid_role_assignment_change_exception'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import RoleAssignmentProvisioningService from '#services/role_assignment_provisioning_service'
import { createRoleAssignmentValidator } from '#validators/role_assignment'

async function createAccount(
  email: string,
  displayName: string,
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' = 'ACTIVE'
) {
  const person = await Person.create({
    displayName,
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: status === 'INVITED' ? null : DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email,
    password: 'Role-assignment-password-1',
    status,
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createFixture() {
  const accessRoot = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
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
  const rootRole = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const rootVersion = await RoleVersion.create({
    roleId: rootRole.id,
    version: 1,
    reason: 'Assignment administration root',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: accessRoot.key,
  })
  const role = await Role.create({
    key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name: 'Stock Counter',
    systemManaged: false,
  })
  const firstVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Initial counting role',
    createdByAccountId: null,
  })
  const latestVersion = await RoleVersion.create({
    roleId: role.id,
    version: 2,
    reason: 'Add review authority for future grants',
    createdByAccountId: null,
  })
  await RoleVersionPermission.createMany([
    { roleVersionId: firstVersion.id, permissionKey: 'stocktake.count' },
    { roleVersionId: latestVersion.id, permissionKey: 'stocktake.count' },
    { roleVersionId: latestVersion.id, permissionKey: 'stocktake.review' },
  ])
  const institute = await OrganizationalUnit.create({
    name: 'Matti Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const department = await OrganizationalUnit.create({
    name: 'Engineering',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const actor = await createAccount('root.assignments@example.com', 'Root Administrator')
  const target = await createAccount('counter.assignments@example.com', 'Assigned Counter')
  const rootAssignment = await RoleAssignment.create({
    accountId: actor.id,
    roleVersionId: rootVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Assignment administration authority',
  })

  return {
    actor,
    department,
    firstVersion,
    institute,
    latestVersion,
    role,
    rootAssignment,
    rootVersion,
    target,
  }
}

function cleanupTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

type GrantPayload = {
  accountId: string
  roleId: string
  scopeOrganizationalUnitId: string
  scopeMode: 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS'
  startMode: 'NOW' | 'SCHEDULED'
  startsAt?: string | number
  expiresAt: string | number | null
  reason: string
}

function grantPayload(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  overrides: Partial<GrantPayload> = {}
): GrantPayload {
  return {
    accountId: fixture.target.id,
    roleId: fixture.role.id,
    scopeOrganizationalUnitId: fixture.department.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startMode: 'NOW',
    expiresAt: null,
    reason: 'Assign counting responsibility',
    ...overrides,
  }
}

test.group('Role assignments administration', (group) => {
  group.each.setup(cleanupTables)

  test('authorizes before validating assignment writes', async ({ client }) => {
    const ordinary = await createAccount('ordinary.assignment@example.com', 'Ordinary Account')

    const anonymous = await client.post('/role-assignments').json({})
    const unauthorized = await authenticatedRequest(
      client.post('/role-assignments').json({}),
      ordinary
    )

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('grants the latest role version with exact server time, audit, and message response', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const before = DateTime.now()
    const response = await authenticatedRequest(
      client.post('/role-assignments').json(grantPayload(fixture)),
      fixture.actor
    )

    response.assertStatus(201)
    response.assertBody({ message: 'Role assignment created.' })
    const assignment = await RoleAssignment.query()
      .where('account_id', fixture.target.id)
      .where('role_version_id', fixture.latestVersion.id)
      .firstOrFail()
    assert.isTrue(assignment.startsAt >= before)
    assert.isNull(assignment.expiresAt)
    const event = await AccessEvent.query()
      .where('event_type', 'ROLE_ASSIGNMENT_GRANTED')
      .where('target_id', assignment.id)
      .firstOrFail()
    assert.equal(event.actorAccountId, fixture.actor.id)
    assert.equal(event.metadata.authorityAssignmentId, fixture.rootAssignment.id)
  })

  test('supports future assignments and rejects invalid schedule and target state', async ({
    client,
  }) => {
    const fixture = await createFixture()
    const suspended = await createAccount(
      'suspended.assignment@example.com',
      'Suspended Account',
      'SUSPENDED'
    )
    const startsAt = DateTime.now().plus({ days: 2 })
    const scheduled = await authenticatedRequest(
      client.post('/role-assignments').json(
        grantPayload(fixture, {
          startMode: 'SCHEDULED',
          startsAt: startsAt.toISO(),
          expiresAt: startsAt.plus({ days: 3 }).toISO(),
        })
      ),
      fixture.actor
    )
    scheduled.assertStatus(201)

    const missingStart = await authenticatedRequest(
      client.post('/role-assignments').json(
        grantPayload(fixture, {
          accountId: suspended.id,
          startMode: 'SCHEDULED',
          startsAt: undefined,
        })
      ),
      fixture.actor
    )
    missingStart.assertStatus(409)

    const invalidTarget = await authenticatedRequest(
      client.post('/role-assignments').json(
        grantPayload(fixture, {
          accountId: suspended.id,
          scopeMode: 'THIS_NODE_ONLY',
        })
      ),
      fixture.actor
    )
    invalidTarget.assertStatus(409)
  })

  test('cancels an upcoming assignment without changing its approved interval', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const startsAt = DateTime.now().plus({ days: 2 })
    const assignment = await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.latestVersion.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt,
      expiresAt: startsAt.plus({ days: 5 }),
      grantedByAccountId: fixture.actor.id,
      reason: 'Future counting coverage',
    })

    const response = await authenticatedRequest(
      client.post(`/role-assignments/${assignment.id}/cancel`).json({
        reason: 'The planned stock take was postponed',
      }),
      fixture.actor
    )

    response.assertStatus(200)
    response.assertBody({ message: 'Upcoming role assignment cancelled.' })
    await assignment.refresh()
    assert.equal(assignment.startsAt.toISO(), startsAt.toISO())
    assert.equal(assignment.expiresAt?.toISO(), startsAt.plus({ days: 5 }).toISO())
    const termination = await RoleAssignmentTermination.findByOrFail('assignmentId', assignment.id)
    assert.equal(termination.kind, 'CANCELLED')
    assert.equal(termination.reason, 'The planned stock take was postponed')
  })

  test('ends an active assignment without rewriting its original expiry', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const originalExpiry = DateTime.now().plus({ days: 10 })
    const assignment = await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.latestVersion.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: DateTime.now().minus({ days: 1 }),
      expiresAt: originalExpiry,
      grantedByAccountId: fixture.actor.id,
      reason: 'Temporary counting coverage',
    })

    const response = await authenticatedRequest(
      client.post(`/role-assignments/${assignment.id}/end`).json({
        reason: 'The temporary responsibility ended early',
      }),
      fixture.actor
    )

    response.assertStatus(200)
    await assignment.refresh()
    assert.equal(assignment.expiresAt?.toISO(), originalExpiry.toISO())
    const termination = await RoleAssignmentTermination.findByOrFail('assignmentId', assignment.id)
    assert.equal(termination.kind, 'ENDED')
  })

  test('atomically replaces an assignment using the latest role version', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const assignment = await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.firstVersion.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'THIS_NODE_ONLY',
      startsAt: DateTime.now().minus({ days: 1 }),
      expiresAt: null,
      grantedByAccountId: fixture.actor.id,
      reason: 'Original role version',
    })

    const response = await authenticatedRequest(
      client.post(`/role-assignments/${assignment.id}/replace`).json(
        grantPayload(fixture, {
          scopeMode: 'THIS_NODE_ONLY',
          reason: 'Move this authority to the latest role version',
        })
      ),
      fixture.actor
    )

    response.assertStatus(200)
    response.assertBody({ message: 'Role assignment replaced.' })
    const termination = await RoleAssignmentTermination.findByOrFail('assignmentId', assignment.id)
    const replacement = await RoleAssignment.findOrFail(termination.replacementAssignmentId!)
    assert.equal(termination.kind, 'REPLACED')
    assert.equal(replacement.roleVersionId, fixture.latestVersion.id)
    assert.equal(termination.effectiveAt.toISO(), replacement.startsAt.toISO())
  })

  test('rejects duplicate overlapping authority', async ({ client }) => {
    const fixture = await createFixture()
    await RoleAssignment.create({
      accountId: fixture.target.id,
      roleVersionId: fixture.latestVersion.id,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'INCLUDE_DESCENDANTS',
      startsAt: DateTime.now().minus({ days: 1 }),
      expiresAt: null,
      grantedByAccountId: fixture.actor.id,
      reason: 'Existing authority',
    })

    const response = await authenticatedRequest(
      client.post('/role-assignments').json(grantPayload(fixture)),
      fixture.actor
    )
    response.assertStatus(409)
  })

  test('serializes concurrent duplicate grants and commits exactly one assignment', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const service = await app.container.make(RoleAssignmentProvisioningService)
    const payload = await createRoleAssignmentValidator.validate(grantPayload(fixture))

    const results = await Promise.allSettled([
      service.create(payload, fixture.actor.id),
      service.create(payload, fixture.actor.id),
    ])

    assert.lengthOf(
      results.filter(({ status }) => status === 'fulfilled'),
      1
    )
    const rejected = results.find(({ status }) => status === 'rejected')
    assert.instanceOf(
      rejected?.status === 'rejected' ? rejected.reason : null,
      InvalidRoleAssignmentChangeException
    )
    assert.lengthOf(
      await RoleAssignment.query()
        .where('account_id', fixture.target.id)
        .where('role_version_id', fixture.latestVersion.id),
      1
    )
    assert.lengthOf(await AccessEvent.query().where('event_type', 'ROLE_ASSIGNMENT_GRANTED'), 1)
  })

  test('transactionally rejects an actor whose root authority became stale', async ({ assert }) => {
    const fixture = await createFixture()
    await fixture.rootAssignment.merge({ expiresAt: DateTime.now().minus({ seconds: 1 }) }).save()
    const service = await app.container.make(RoleAssignmentProvisioningService)
    const payload = await createRoleAssignmentValidator.validate(grantPayload(fixture))

    try {
      await service.create(payload, fixture.actor.id)
      assert.fail('Expected stale root authority to reject assignment provisioning')
    } catch (error) {
      assert.instanceOf(error, AccessAuthorityChangedException)
    }
    assert.isNull(
      await RoleAssignment.query()
        .where('account_id', fixture.target.id)
        .where('role_version_id', fixture.latestVersion.id)
        .first()
    )
  })

  test('rolls back an attempt to end the last continuous root assignment', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const response = await authenticatedRequest(
      client.post(`/role-assignments/${fixture.rootAssignment.id}/end`).json({
        reason: 'Attempt to remove the final root',
      }),
      fixture.actor
    )

    response.assertStatus(409)
    assert.isNull(await RoleAssignmentTermination.findBy('assignmentId', fixture.rootAssignment.id))
  })
})
