import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessEvent from '#models/access_event'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'

async function createAccount(
  email: string,
  displayName: string,
  status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE'
) {
  const person = await Person.create({
    displayName,
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email,
    password: 'Account-access-timeline-password-1',
    status,
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createFixture() {
  const permission = await Permission.create({
    key: 'access.root',
    description: 'Administer identity, access, and organizational authority',
    customRoleAssignable: false,
  })
  const rootRole = await Role.create({
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
  })
  const rootVersion = await RoleVersion.create({
    roleId: rootRole.id,
    version: 1,
    reason: 'Account timeline root role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({
    roleVersionId: rootVersion.id,
    permissionKey: permission.key,
  })
  const businessRole = await Role.create({
    key: `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name: 'Timeline Reviewer',
    systemManaged: false,
  })
  const businessVersion = await RoleVersion.create({
    roleId: businessRole.id,
    version: 1,
    reason: 'Account timeline business role',
    createdByAccountId: null,
  })
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const department = await OrganizationalUnit.create({
    name: 'Internal Audit',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const actor = await createAccount('root.timeline@example.com', 'Root Timeline')
  const target = await createAccount('target.timeline@example.com', 'Target Timeline')
  const ordinary = await createAccount('ordinary.timeline@example.com', 'Ordinary Timeline')
  const other = await createAccount('other.timeline@example.com', 'Other Timeline')
  await RoleAssignment.create({
    accountId: actor.id,
    roleVersionId: rootVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 5 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Account timeline root authority',
  })
  const targetAssignment = await RoleAssignment.create({
    accountId: target.id,
    roleVersionId: businessVersion.id,
    scopeOrgUnitId: department.id,
    scopeMode: 'THIS_NODE_ONLY',
    startsAt: DateTime.now().minus({ days: 2 }),
    expiresAt: DateTime.now().plus({ days: 5 }),
    grantedByAccountId: actor.id,
    reason: 'Account timeline target assignment',
  })
  const otherAssignment = await RoleAssignment.create({
    accountId: other.id,
    roleVersionId: businessVersion.id,
    scopeOrgUnitId: department.id,
    scopeMode: 'THIS_NODE_ONLY',
    startsAt: DateTime.now().minus({ days: 2 }),
    expiresAt: DateTime.now().plus({ days: 5 }),
    grantedByAccountId: actor.id,
    reason: 'Unrelated assignment',
  })
  const targetDelegation = await Delegation.create({
    delegatorAccountId: other.id,
    delegateAccountId: target.id,
    startsAt: DateTime.now().plus({ days: 1 }),
    expiresAt: DateTime.now().plus({ days: 2 }),
    reason: 'Target timeline coverage',
  })
  const unrelatedDelegation = await Delegation.create({
    delegatorAccountId: actor.id,
    delegateAccountId: other.id,
    startsAt: DateTime.now().plus({ days: 1 }),
    expiresAt: DateTime.now().plus({ days: 2 }),
    reason: 'Unrelated coverage',
  })

  return {
    actor,
    businessRole,
    businessVersion,
    department,
    ordinary,
    other,
    otherAssignment,
    target,
    targetAssignment,
    targetDelegation,
    unrelatedDelegation,
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

test.group('Access events account timeline', (group) => {
  group.each.setup(cleanupTables)

  test('rejects anonymous and non-root timeline reads', async ({ client }) => {
    const fixture = await createFixture()

    const anonymous = await client.get(`/accounts/${fixture.target.id}/access-events`)
    const unauthorized = await authenticatedRequest(
      client.get(`/accounts/${fixture.target.id}/access-events`),
      fixture.ordinary
    )

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('returns direct, owned-assignment, and participated-delegation events safely', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const now = DateTime.now()
    const accountEvent = await AccessEvent.create({
      eventType: 'ACCOUNT_SUSPENDED',
      actorType: 'ACCOUNT',
      actorAccountId: fixture.actor.id,
      targetType: 'USER_ACCOUNT',
      targetId: fixture.target.id,
      reason: 'Temporary investigation',
      identifierFingerprint: 'a'.repeat(64),
      requestIp: '192.0.2.10',
      requestId: 'sensitive-request-id',
      metadata: {
        previousStatus: 'ACTIVE',
        status: 'SUSPENDED',
        challengeId: 'sensitive-challenge-id',
        credentialVersion: 9,
        passwordResetVersion: 7,
      },
      createdAt: now.minus({ minutes: 5 }),
    })
    const authenticationEvent = await AccessEvent.create({
      eventType: 'LOGIN_REJECTED_ACCOUNT_STATUS',
      actorType: 'SYSTEM',
      actorAccountId: null,
      targetType: 'USER_ACCOUNT',
      targetId: fixture.target.id,
      reason: null,
      metadata: { status: 'SUSPENDED', submittedEmail: 'must-not-leak@example.com' },
      createdAt: now.minus({ minutes: 4 }),
    })
    const authorityAssignmentId = randomUUID()
    const assignmentEvent = await AccessEvent.create({
      eventType: 'ROLE_ASSIGNMENT_GRANTED',
      actorType: 'ACCOUNT',
      actorAccountId: fixture.actor.id,
      targetType: 'ROLE_ASSIGNMENT',
      targetId: fixture.targetAssignment.id,
      reason: 'Temporary audit review',
      metadata: {
        authorityAssignmentId,
        effectivePermission: 'access.root',
        accountId: fixture.target.id,
        roleId: fixture.businessRole.id,
        roleVersionId: fixture.businessVersion.id,
        roleVersion: 1,
        scopeOrganizationalUnitId: fixture.department.id,
        scopeMode: 'THIS_NODE_ONLY',
        startsAt: fixture.targetAssignment.startsAt.toISO(),
        expiresAt: fixture.targetAssignment.expiresAt?.toISO(),
        privateNote: 'must not leak',
      },
      createdAt: now.minus({ minutes: 3 }),
    })
    const delegationEvent = await AccessEvent.create({
      eventType: 'DELEGATION_PROPOSED',
      actorType: 'ACCOUNT',
      actorAccountId: fixture.other.id,
      targetType: 'DELEGATION',
      targetId: fixture.targetDelegation.id,
      reason: 'Cover an absence',
      metadata: {
        delegateAccountId: fixture.target.id,
        sourceAssignmentIds: [fixture.otherAssignment.id],
        startsAt: fixture.targetDelegation.startsAt.toISO(),
        expiresAt: fixture.targetDelegation.expiresAt.toISO(),
        arbitrarySecret: 'must not leak',
      },
      createdAt: now.minus({ minutes: 2 }),
    })
    const futureEvent = await AccessEvent.create({
      eventType: 'FUTURE_ACCOUNT_EVENT',
      actorType: 'SYSTEM',
      actorAccountId: null,
      targetType: 'USER_ACCOUNT',
      targetId: fixture.target.id,
      reason: 'Future safe envelope',
      metadata: { newSensitiveField: 'must not leak' },
      createdAt: now.minus({ minutes: 1 }),
    })
    await AccessEvent.createMany([
      {
        eventType: 'ROLE_ASSIGNMENT_GRANTED',
        actorType: 'ACCOUNT',
        actorAccountId: fixture.actor.id,
        targetType: 'ROLE_ASSIGNMENT',
        targetId: fixture.otherAssignment.id,
        reason: 'Unrelated assignment event',
        metadata: {},
        createdAt: now,
      },
      {
        eventType: 'DELEGATION_PROPOSED',
        actorType: 'ACCOUNT',
        actorAccountId: fixture.actor.id,
        targetType: 'DELEGATION',
        targetId: fixture.unrelatedDelegation.id,
        reason: 'Unrelated delegation event',
        metadata: {},
        createdAt: now,
      },
      {
        eventType: 'ROLE_RENAMED',
        actorType: 'ACCOUNT',
        actorAccountId: fixture.actor.id,
        targetType: 'ROLE',
        targetId: fixture.businessRole.id,
        reason: 'Indirect role history',
        metadata: {},
        createdAt: now,
      },
    ])
    await fixture.target.merge({ status: 'SUSPENDED' }).save()

    const response = await authenticatedRequest(
      client.get(`/accounts/${fixture.target.id}/access-events`),
      fixture.actor
    )

    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map(({ id }: { id: string }) => id),
      [
        futureEvent.id,
        delegationEvent.id,
        assignmentEvent.id,
        authenticationEvent.id,
        accountEvent.id,
      ]
    )
    assert.equal(response.body().metadata.total, 5)
    assert.equal(response.body().metadata.perPage, 20)

    const account = response.body().data.find(({ id }: { id: string }) => id === accountEvent.id)
    assert.deepInclude(account, {
      eventType: 'ACCOUNT_SUSPENDED',
      category: 'ACCOUNT',
      reason: 'Temporary investigation',
      actor: {
        type: 'ACCOUNT',
        account: {
          id: fixture.actor.id,
          person: {
            id: fixture.actor.personId,
            displayName: 'Root Timeline',
          },
        },
      },
      target: {
        type: 'USER_ACCOUNT',
        id: fixture.target.id,
        context: null,
      },
      details: {
        previousStatus: 'ACTIVE',
        status: 'SUSPENDED',
      },
    })
    assert.notProperty(account.actor.account, 'email')

    const authentication = response
      .body()
      .data.find(({ id }: { id: string }) => id === authenticationEvent.id)
    assert.deepInclude(authentication, {
      category: 'AUTHENTICATION',
      actor: { type: 'SYSTEM', account: null },
      details: { accountStatus: 'SUSPENDED' },
    })

    const assignment = response
      .body()
      .data.find(({ id }: { id: string }) => id === assignmentEvent.id)
    assert.deepInclude(assignment, {
      category: 'ROLE_ASSIGNMENT',
      authorization: {
        roleAssignmentId: authorityAssignmentId,
        effectivePermission: 'access.root',
      },
      target: {
        type: 'ROLE_ASSIGNMENT',
        id: fixture.targetAssignment.id,
        context: {
          kind: 'ROLE_ASSIGNMENT',
          role: {
            id: fixture.businessRole.id,
            key: fixture.businessRole.key,
            name: 'Timeline Reviewer',
            versionId: fixture.businessVersion.id,
            version: 1,
          },
          scope: {
            organizationalUnitId: fixture.department.id,
            name: 'Internal Audit',
            unitType: 'DEPARTMENT',
            mode: 'THIS_NODE_ONLY',
          },
          startsAt: fixture.targetAssignment.startsAt.toISO(),
          expiresAt: fixture.targetAssignment.expiresAt?.toISO(),
        },
      },
    })

    const delegation = response
      .body()
      .data.find(({ id }: { id: string }) => id === delegationEvent.id)
    assert.deepInclude(delegation, {
      category: 'DELEGATION',
      target: {
        type: 'DELEGATION',
        id: fixture.targetDelegation.id,
        context: {
          kind: 'DELEGATION',
          delegator: {
            accountId: fixture.other.id,
            personId: fixture.other.personId,
            displayName: 'Other Timeline',
          },
          delegate: {
            accountId: fixture.target.id,
            personId: fixture.target.personId,
            displayName: 'Target Timeline',
          },
          startsAt: fixture.targetDelegation.startsAt.toISO(),
          expiresAt: fixture.targetDelegation.expiresAt.toISO(),
        },
      },
      details: {
        delegateAccountId: fixture.target.id,
        sourceAssignmentIds: [fixture.otherAssignment.id],
        startsAt: fixture.targetDelegation.startsAt.toISO(),
        expiresAt: fixture.targetDelegation.expiresAt.toISO(),
      },
    })

    const future = response.body().data.find(({ id }: { id: string }) => id === futureEvent.id)
    assert.equal(future.category, 'OTHER')
    assert.deepEqual(future.details, {})

    const serialized = JSON.stringify(response.body())
    for (const sensitive of [
      '192.0.2.10',
      'sensitive-request-id',
      'sensitive-challenge-id',
      'submittedEmail',
      'must-not-leak@example.com',
      'privateNote',
      'arbitrarySecret',
      'newSensitiveField',
      'credentialVersion',
      'passwordResetVersion',
      'identifierFingerprint',
    ]) {
      assert.notInclude(serialized, sensitive)
    }
  })

  test('filters by category and exact event type', async ({ client, assert }) => {
    const fixture = await createFixture()
    await AccessEvent.createMany([
      {
        eventType: 'PASSWORD_CHANGED',
        actorType: 'ACCOUNT',
        actorAccountId: fixture.target.id,
        targetType: 'USER_ACCOUNT',
        targetId: fixture.target.id,
        reason: 'Changed password',
        metadata: {},
      },
      {
        eventType: 'ACCOUNT_SUSPENDED',
        actorType: 'ACCOUNT',
        actorAccountId: fixture.actor.id,
        targetType: 'USER_ACCOUNT',
        targetId: fixture.target.id,
        reason: 'Suspended',
        metadata: {},
      },
      {
        eventType: 'FUTURE_ACCOUNT_EVENT',
        actorType: 'SYSTEM',
        actorAccountId: null,
        targetType: 'USER_ACCOUNT',
        targetId: fixture.target.id,
        reason: null,
        metadata: {},
      },
    ])

    const credential = await authenticatedRequest(
      client
        .get(`/accounts/${fixture.target.id}/access-events`)
        .qs({ category: 'CREDENTIAL', eventType: 'PASSWORD_CHANGED' }),
      fixture.actor
    )
    credential.assertStatus(200)
    assert.deepEqual(
      credential.body().data.map(({ eventType }: { eventType: string }) => eventType),
      ['PASSWORD_CHANGED']
    )

    const other = await authenticatedRequest(
      client.get(`/accounts/${fixture.target.id}/access-events`).qs({ category: 'OTHER' }),
      fixture.actor
    )
    other.assertStatus(200)
    assert.deepEqual(
      other.body().data.map(({ eventType }: { eventType: string }) => eventType),
      ['FUTURE_ACCOUNT_EVENT']
    )
  })

  test('uses stable fixed pagination in reverse chronological order', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const start = DateTime.now().minus({ hours: 1 })
    await AccessEvent.createMany(
      Array.from({ length: 21 }, (_, index) => ({
        eventType: 'PASSWORD_CHANGED',
        actorType: 'ACCOUNT' as const,
        actorAccountId: fixture.target.id,
        targetType: 'USER_ACCOUNT',
        targetId: fixture.target.id,
        reason: `Password event ${index + 1}`,
        metadata: {},
        createdAt: start.plus({ minutes: index }),
      }))
    )

    const first = await authenticatedRequest(
      client.get(`/accounts/${fixture.target.id}/access-events`).qs({ page: 1 }),
      fixture.actor
    )
    const second = await authenticatedRequest(
      client.get(`/accounts/${fixture.target.id}/access-events`).qs({ page: 2 }),
      fixture.actor
    )

    first.assertStatus(200)
    second.assertStatus(200)
    assert.lengthOf(first.body().data, 20)
    assert.lengthOf(second.body().data, 1)
    assert.equal(first.body().data[0].reason, 'Password event 21')
    assert.equal(second.body().data[0].reason, 'Password event 1')
    assert.equal(first.body().metadata.total, 21)
  })

  test('validates filters and returns not found only after root authorization', async ({
    client,
  }) => {
    const fixture = await createFixture()
    const missingId = randomUUID()

    const invalid = await authenticatedRequest(
      client
        .get(`/accounts/${fixture.target.id}/access-events`)
        .qs({ page: 0, category: 'UNKNOWN', eventType: '' } as never),
      fixture.actor
    )
    const missing = await authenticatedRequest(
      client.get(`/accounts/${missingId}/access-events`),
      fixture.actor
    )
    const hiddenMissing = await authenticatedRequest(
      client.get(`/accounts/${missingId}/access-events`),
      fixture.ordinary
    )

    invalid.assertStatus(422)
    missing.assertStatus(404)
    hiddenMissing.assertStatus(403)
  })
})
