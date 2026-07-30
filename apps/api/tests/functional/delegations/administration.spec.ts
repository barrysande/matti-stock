import { randomUUID } from 'node:crypto'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import InvalidDelegationChangeException from '#exceptions/invalid_delegation_change_exception'
import AccessEvent from '#models/access_event'
import Delegation from '#models/delegation'
import DelegationAssignment from '#models/delegation_assignment'
import DelegationResponse from '#models/delegation_response'
import DelegationTermination from '#models/delegation_termination'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import DelegationProvisioningService from '#services/delegation_provisioning_service'
import EffectiveAccessService from '#services/effective_access_service'
import { createDelegationValidator } from '#validators/delegation'

async function createAccount(email: string, displayName: string) {
  const person = await Person.create({
    displayName,
    staffNumber: null,
    primaryEmail: email,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email,
    password: 'Delegation-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

async function createRole(
  key: string,
  name: string,
  permissionKeys: string[],
  systemManaged = false
) {
  const role = await Role.create({ key, name, systemManaged })
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
      key: 'access.root',
      description: 'Administer identity, access, and organizational authority',
      customRoleAssignable: false,
    },
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
  const rootRole = await createRole('MASTER_ADMIN', 'Master Admin', ['access.root'], true)
  const supervisorRole = await createRole(
    `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    'Stock Supervisor',
    ['stocktake.count']
  )
  const reviewerRole = await createRole(
    `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    'Stock Reviewer',
    ['stocktake.review']
  )
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
  const workshop = await OrganizationalUnit.create({
    name: 'Workshop',
    unitType: 'SUB_DEPARTMENT',
    parentId: department.id,
  })
  const root = await createAccount('root.delegation@example.com', 'Root Administrator')
  const holder = await createAccount('holder.delegation@example.com', 'Direct Holder')
  const delegate = await createAccount('delegate.delegation@example.com', 'Proposed Delegate')
  const other = await createAccount('other.delegation@example.com', 'Other Account')
  const rootAssignment = await RoleAssignment.create({
    accountId: root.id,
    roleVersionId: rootRole.version.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Delegation administration root',
  })
  const supervisorAssignment = await RoleAssignment.create({
    accountId: holder.id,
    roleVersionId: supervisorRole.version.id,
    scopeOrgUnitId: department.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: DateTime.now().plus({ days: 20 }),
    grantedByAccountId: root.id,
    reason: 'Departmental supervision',
  })
  const reviewerAssignment = await RoleAssignment.create({
    accountId: holder.id,
    roleVersionId: reviewerRole.version.id,
    scopeOrgUnitId: department.id,
    scopeMode: 'THIS_NODE_ONLY',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: DateTime.now().plus({ days: 20 }),
    grantedByAccountId: root.id,
    reason: 'Departmental review',
  })
  return {
    delegate,
    department,
    holder,
    institute,
    other,
    reviewerAssignment,
    root,
    rootAssignment,
    supervisorAssignment,
    workshop,
  }
}

async function cleanupTables() {
  for (const table of [
    'access_events',
    'delegation_terminations',
    'delegation_responses',
    'delegation_assignments',
    'delegations',
    'role_assignment_terminations',
    'role_assignments',
    'role_version_permissions',
    'role_versions',
    'roles',
    'organizational_unit_versions',
    'user_accounts',
    'people',
    'organizational_units',
    'permissions',
  ]) {
    await db.from(table).delete()
  }
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

function proposal(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  assignmentIds = [fixture.supervisorAssignment.id],
  delegateAccountId = fixture.delegate.id
) {
  return {
    delegateAccountId,
    assignmentIds,
    startMode: 'NOW' as const,
    expiresAt: DateTime.now().plus({ days: 5 }).toISO(),
    reason: 'Temporary absence coverage',
  }
}

async function proposeAndAccept(
  fixture: Awaited<ReturnType<typeof createFixture>>,
  assignmentIds = [fixture.supervisorAssignment.id]
) {
  const service = await app.container.make(DelegationProvisioningService)
  const payload = await createDelegationValidator.validate(proposal(fixture, assignmentIds))
  const delegation = await service.create(payload, fixture.holder.id)
  await DelegationResponse.create({
    delegationId: delegation.id,
    kind: 'ACCEPTED',
    respondedByAccountId: fixture.delegate.id,
    reason: null,
  })
  return delegation
}

test.group('Delegation administration', (group) => {
  group.each.setup(cleanupTables)
  group.each.teardown(cleanupTables)

  test('proposes and accepts several complete assignments through one atomic response', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const proposed = await authenticatedRequest(
      client
        .post('/delegations')
        .json(proposal(fixture, [fixture.supervisorAssignment.id, fixture.reviewerAssignment.id])),
      fixture.holder
    )
    proposed.assertStatus(201)
    proposed.assertBody({ message: 'Delegation proposed.' })

    const delegation = await Delegation.query().preload('assignments').firstOrFail()
    assert.deepEqual(
      delegation.assignments.map(({ sourceAssignmentId }) => sourceAssignmentId).sort(),
      [fixture.supervisorAssignment.id, fixture.reviewerAssignment.id].sort()
    )

    const accepted = await authenticatedRequest(
      client.post(`/delegations/${delegation.id}/accept`).json({}),
      fixture.delegate
    )
    accepted.assertStatus(200)
    accepted.assertBody({ message: 'Delegation accepted.' })
    const recordedResponse = await DelegationResponse.findByOrFail('delegationId', delegation.id)
    assert.equal(recordedResponse.kind, 'ACCEPTED')
    assert.lengthOf(await AccessEvent.query().where('target_id', delegation.id), 2)

    const access = await app.container.make(EffectiveAccessService)
    const count = await access.authorize(
      fixture.delegate.id,
      'stocktake.count',
      fixture.workshop.id
    )
    const review = await access.authorize(
      fixture.delegate.id,
      'stocktake.review',
      fixture.department.id
    )
    assert.equal(count?.evidenceType, 'DELEGATED')
    assert.equal(count?.delegationId, delegation.id)
    assert.equal(review?.assignmentId, fixture.reviewerAssignment.id)
  })

  test('rejects self, foreign, root, duplicate-item, and overlong source proposals', async ({
    client,
  }) => {
    const fixture = await createFixture()
    const requests = [
      proposal(fixture, [fixture.supervisorAssignment.id], fixture.holder.id),
      proposal(fixture, [fixture.supervisorAssignment.id], fixture.delegate.id),
      proposal(fixture, [fixture.rootAssignment.id], fixture.delegate.id),
      proposal(fixture, [fixture.supervisorAssignment.id, fixture.supervisorAssignment.id]),
      {
        ...proposal(fixture),
        expiresAt: fixture.supervisorAssignment.expiresAt!.plus({ days: 1 }).toISO(),
      },
    ]
    const actors = [fixture.holder, fixture.other, fixture.root, fixture.holder, fixture.holder]

    for (const [index, payload] of requests.entries()) {
      const response = await authenticatedRequest(
        client.post('/delegations').json(payload),
        actors[index]!
      )
      response.assertStatus(409)
    }
    const anonymous = await client.post('/delegations').json({})
    anonymous.assertStatus(401)
  })

  test('serializes concurrent proposals and commits one overlapping coverage arrangement', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const service = await app.container.make(DelegationProvisioningService)
    const payload = await createDelegationValidator.validate(proposal(fixture))

    const results = await Promise.allSettled([
      service.create(payload, fixture.holder.id),
      service.create(payload, fixture.holder.id),
    ])

    assert.lengthOf(
      results.filter(({ status }) => status === 'fulfilled'),
      1
    )
    const rejection = results.find(({ status }) => status === 'rejected')
    assert.instanceOf(
      rejection?.status === 'rejected' ? rejection.reason : null,
      InvalidDelegationChangeException
    )
    assert.lengthOf(await Delegation.all(), 1)
  })

  test('allows late acceptance before expiry and enforces rejection reason and one response', async ({
    client,
  }) => {
    const fixture = await createFixture()
    const delegation = await Delegation.create({
      delegatorAccountId: fixture.holder.id,
      delegateAccountId: fixture.delegate.id,
      startsAt: DateTime.now().minus({ hours: 1 }),
      expiresAt: DateTime.now().plus({ hours: 1 }),
      reason: 'Coverage started before the response',
    })
    await DelegationAssignment.create({
      delegationId: delegation.id,
      sourceAssignmentId: fixture.supervisorAssignment.id,
    })

    const missingReason = await authenticatedRequest(
      // Deliberately bypass the generated valid-request type to exercise runtime validation.
      client.post(`/delegations/${delegation.id}/reject`).json({} as never),
      fixture.delegate
    )
    missingReason.assertStatus(422)

    const accepted = await authenticatedRequest(
      client.post(`/delegations/${delegation.id}/accept`).json({
        reason: 'I can take the temporary responsibility',
      }),
      fixture.delegate
    )
    accepted.assertStatus(200)
    const repeated = await authenticatedRequest(
      client.post(`/delegations/${delegation.id}/reject`).json({ reason: 'Changed my mind' }),
      fixture.delegate
    )
    repeated.assertStatus(409)
  })

  test('supports revocation, relinquishment, and root administrative termination independently', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const pendingService = await app.container.make(DelegationProvisioningService)
    const pending = await pendingService.create(
      await createDelegationValidator.validate(proposal(fixture)),
      fixture.holder.id
    )
    const revoked = await authenticatedRequest(
      client
        .post(`/delegations/${pending.id}/revoke`)
        .json({ reason: 'Coverage is no longer needed' }),
      fixture.holder
    )
    revoked.assertStatus(200)
    const revocation = await DelegationTermination.findByOrFail('delegationId', pending.id)
    assert.equal(revocation.kind, 'REVOKED')

    const accepted = await proposeAndAccept(fixture)
    const relinquished = await authenticatedRequest(
      client
        .post(`/delegations/${accepted.id}/relinquish`)
        .json({ reason: 'I can no longer provide coverage' }),
      fixture.delegate
    )
    relinquished.assertStatus(200)

    const administrated = await pendingService.create(
      await createDelegationValidator.validate(proposal(fixture)),
      fixture.holder.id
    )
    const terminated = await authenticatedRequest(
      client
        .post(`/delegations/${administrated.id}/terminate`)
        .json({ reason: 'Administrative access correction' }),
      fixture.root
    )
    terminated.assertStatus(200)
    const administrativeTermination = await DelegationTermination.findByOrFail(
      'delegationId',
      administrated.id
    )
    assert.equal(administrativeTermination.kind, 'ADMINISTRATIVELY_TERMINATED')
  })

  test('limits reads to participants while access.root can inspect every proposal', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const delegation = await proposeAndAccept(fixture)

    for (const participant of [fixture.holder, fixture.delegate, fixture.root]) {
      const response = await authenticatedRequest(
        client.get(`/delegations/${delegation.id}`),
        participant
      )
      response.assertStatus(200)
      response.assertBodyContains({
        data: {
          id: delegation.id,
          delegator: { accountId: fixture.holder.id },
          delegate: { accountId: fixture.delegate.id },
          effectiveItemCount: 1,
          totalItemCount: 1,
        },
      })
      assert.property(response.body().data, 'reason')
      assert.property(response.body().data, 'response')
      assert.property(response.body().data.assignments[0], 'source')
      assert.property(response.body().data.assignments[0], 'role')
      assert.property(response.body().data.assignments[0], 'scope')
      assert.property(response.body().data.assignments[0].source.role, 'permissionKeys')
    }
    const hidden = await authenticatedRequest(
      client.get(`/delegations/${delegation.id}`),
      fixture.other
    )
    hidden.assertStatus(404)
  })

  test('keeps list projections lightweight and makes partially effective items explicit', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const delegation = await proposeAndAccept(fixture, [
      fixture.supervisorAssignment.id,
      fixture.reviewerAssignment.id,
    ])
    await RoleAssignmentTermination.create({
      assignmentId: fixture.reviewerAssignment.id,
      kind: 'ENDED',
      effectiveAt: DateTime.now(),
      replacementAssignmentId: null,
      terminatedByAccountId: fixture.root.id,
      reason: 'Review coverage ended independently',
    })

    const response = await authenticatedRequest(client.get('/delegations'), fixture.holder)

    response.assertStatus(200)
    const summary = response.body().data.find(({ id }: { id: string }) => id === delegation.id)
    assert.equal(summary.status, 'ACTIVE')
    assert.equal(summary.effectiveNow, true)
    assert.equal(summary.effectiveItemCount, 1)
    assert.equal(summary.totalItemCount, 2)
    assert.deepEqual(
      summary.assignments.map(({ effectiveNow }: { effectiveNow: boolean }) => effectiveNow).sort(),
      [false, true]
    )
    assert.notProperty(summary, 'reason')
    assert.notProperty(summary, 'response')
    assert.notProperty(summary, 'termination')
    assert.notProperty(summary.assignments[0], 'source')
    assert.notProperty(summary.assignments[0].role, 'permissionKeys')

    const account = await authenticatedRequest(
      client.get(`/accounts/${fixture.holder.id}`),
      fixture.root
    )
    account.assertStatus(200)
    const embedded = account
      .body()
      .data.delegations.outgoing.find(({ id }: { id: string }) => id === delegation.id)
    assert.equal(embedded.effectiveItemCount, 1)
    assert.notProperty(embedded, 'reason')
    assert.notProperty(embedded.assignments[0], 'source')
  })

  test('returns the same derived lifecycle category for every SQL status filter', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const now = DateTime.now()
    const records: Array<{
      status:
        | 'PENDING'
        | 'UPCOMING'
        | 'ACTIVE'
        | 'REJECTED'
        | 'EXPIRED'
        | 'REVOKED'
        | 'RELINQUISHED'
        | 'ADMINISTRATIVELY_TERMINATED'
      delegation: Delegation
    }> = []

    for (const status of [
      'PENDING',
      'UPCOMING',
      'ACTIVE',
      'REJECTED',
      'EXPIRED',
      'REVOKED',
      'RELINQUISHED',
      'ADMINISTRATIVELY_TERMINATED',
    ] as const) {
      const delegation = await Delegation.create({
        delegatorAccountId: fixture.holder.id,
        delegateAccountId: fixture.delegate.id,
        startsAt: status === 'UPCOMING' ? now.plus({ days: 1 }) : now.minus({ days: 1 }),
        expiresAt: status === 'EXPIRED' ? now.minus({ minutes: 1 }) : now.plus({ days: 2 }),
        reason: `Lifecycle fixture for ${status}`,
      })
      await DelegationAssignment.create({
        delegationId: delegation.id,
        sourceAssignmentId: fixture.supervisorAssignment.id,
      })
      if (status !== 'PENDING' && status !== 'REJECTED') {
        await DelegationResponse.create({
          delegationId: delegation.id,
          kind: 'ACCEPTED',
          respondedByAccountId: fixture.delegate.id,
          reason: null,
        })
      } else if (status === 'REJECTED') {
        await DelegationResponse.create({
          delegationId: delegation.id,
          kind: 'REJECTED',
          respondedByAccountId: fixture.delegate.id,
          reason: 'Unable to provide coverage',
        })
      }
      if (
        status === 'REVOKED' ||
        status === 'RELINQUISHED' ||
        status === 'ADMINISTRATIVELY_TERMINATED'
      ) {
        await DelegationTermination.create({
          delegationId: delegation.id,
          kind: status as 'REVOKED' | 'RELINQUISHED' | 'ADMINISTRATIVELY_TERMINATED',
          effectiveAt: now,
          terminatedByAccountId: fixture.root.id,
          reason: `End ${status.toLowerCase()} fixture`,
        })
      }
      records.push({ status, delegation })
    }

    for (const { status, delegation } of records) {
      const response = await authenticatedRequest(
        client.get('/delegations').qs({ status }),
        fixture.root
      )
      response.assertStatus(200)
      assert.deepEqual(
        response.body().data.map(({ id }: { id: string }) => id),
        [delegation.id]
      )
      assert.equal(response.body().data[0].status, status)
    }
  })

  test('denies pending and expired coverage and removes authority synchronously with its source', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    const service = await app.container.make(DelegationProvisioningService)
    const delegation = await service.create(
      await createDelegationValidator.validate(proposal(fixture)),
      fixture.holder.id
    )
    const access = await app.container.make(EffectiveAccessService)

    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )
    await DelegationResponse.create({
      delegationId: delegation.id,
      kind: 'ACCEPTED',
      respondedByAccountId: fixture.delegate.id,
      reason: null,
    })
    const delegatedEvidence = await access.authorize(
      fixture.delegate.id,
      'stocktake.count',
      fixture.workshop.id
    )
    assert.equal(delegatedEvidence?.delegationId, delegation.id)

    const sourceTermination = await RoleAssignmentTermination.create({
      assignmentId: fixture.supervisorAssignment.id,
      kind: 'ENDED',
      effectiveAt: DateTime.now(),
      replacementAssignmentId: null,
      terminatedByAccountId: fixture.root.id,
      reason: 'Direct authority ended',
    })
    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )

    await sourceTermination.delete()
    delegation.startsAt = DateTime.now().minus({ days: 1 })
    delegation.expiresAt = DateTime.now().minus({ seconds: 1 })
    await delegation.save()
    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )
  })

  test('removes delegated authority when the delegate, role, or scope becomes inactive', async ({
    assert,
  }) => {
    const fixture = await createFixture()
    await proposeAndAccept(fixture)
    const access = await app.container.make(EffectiveAccessService)

    fixture.delegate.status = 'SUSPENDED'
    await fixture.delegate.save()
    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )
    fixture.delegate.status = 'ACTIVE'
    await fixture.delegate.save()

    await fixture.supervisorAssignment.load('roleVersion', (builder) => builder.preload('role'))
    fixture.supervisorAssignment.roleVersion.role.archivedAt = DateTime.now()
    await fixture.supervisorAssignment.roleVersion.role.save()
    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )
    fixture.supervisorAssignment.roleVersion.role.archivedAt = null
    await fixture.supervisorAssignment.roleVersion.role.save()

    fixture.department.archivedAt = DateTime.now()
    await fixture.department.save()
    assert.isNull(
      await access.authorize(fixture.delegate.id, 'stocktake.count', fixture.workshop.id)
    )
  })

  test('prefers direct evidence and exposes delegated attribution through auth me', async ({
    client,
    assert,
  }) => {
    const fixture = await createFixture()
    const delegation = await proposeAndAccept(fixture)
    const direct = await RoleAssignment.create({
      accountId: fixture.delegate.id,
      roleVersionId: fixture.supervisorAssignment.roleVersionId,
      scopeOrgUnitId: fixture.department.id,
      scopeMode: 'INCLUDE_DESCENDANTS',
      startsAt: DateTime.now().minus({ minutes: 1 }),
      expiresAt: DateTime.now().plus({ days: 2 }),
      grantedByAccountId: fixture.root.id,
      reason: 'Direct authority should be preferred',
    })
    const access = await app.container.make(EffectiveAccessService)

    const evidence = await access.authorize(
      fixture.delegate.id,
      'stocktake.count',
      fixture.workshop.id
    )
    assert.equal(evidence?.evidenceType, 'DIRECT')
    assert.equal(evidence?.assignmentId, direct.id)

    const current = await authenticatedRequest(client.get('/auth/me'), fixture.delegate)
    current.assertStatus(200)
    current.assertBodyContains({
      data: {
        effectivePermissionKeys: ['stocktake.count'],
        delegatedRoleAssignments: [
          {
            delegationId: delegation.id,
            sourceAssignmentId: fixture.supervisorAssignment.id,
            delegatorAccountId: fixture.holder.id,
            delegateAccountId: fixture.delegate.id,
          },
        ],
      },
    })
  })

  test('does not let delegated authority become a delegation source', async ({ client }) => {
    const fixture = await createFixture()
    await proposeAndAccept(fixture)

    const response = await authenticatedRequest(
      client
        .post('/delegations')
        .json(proposal(fixture, [fixture.supervisorAssignment.id], fixture.other.id)),
      fixture.delegate
    )
    response.assertStatus(409)
  })
})
