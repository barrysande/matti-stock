import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import AccessAuthorityChangedException from '#exceptions/access_authority_changed_exception'
import DuplicateException from '#exceptions/duplicate_exception'
import AccessEvent from '#models/access_event'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import PhysicalLocation from '#models/physical_location'
import PhysicalLocationVersion from '#models/physical_location_version'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import PhysicalLocationProvisioningService from '#services/physical_location_provisioning_service'

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
    password: 'Administration-password-1',
    status: 'ACTIVE',
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
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
  })
  const roleVersion = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Physical-location administration test role',
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
  const account = await createAccount(
    'root.location.administration@example.com',
    'Root Administrator'
  )
  const assignment = await RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: institute.id,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: null,
    grantedByAccountId: null,
    reason: 'Physical-location administration authority',
  })

  return { account, assignment }
}

async function createLocation(
  name: string,
  parentId: string | null,
  changedByAccountId: string,
  archivedAt: DateTime | null = null
) {
  const location = await PhysicalLocation.create({ name, parentId, archivedAt })
  await PhysicalLocationVersion.create({
    physicalLocationId: location.id,
    version: 1,
    name,
    parentId,
    archivedAt,
    effectiveFrom: location.createdAt,
    effectiveTo: null,
    changedByAccountId,
    reason: `Create ${name} test location`,
  })
  return location
}

function cleanupTables() {
  return testUtils.db().truncate()
}

function authenticatedRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

test.group('Physical locations administration', (group) => {
  group.each.setup(cleanupTables)

  test('authorizes before validating physical-location writes', async ({ client }) => {
    const account = await createAccount(
      'ordinary.location.administration@example.com',
      'Ordinary Administrator'
    )

    const anonymous = await client.post('/physical-locations').json({})
    const unauthorized = await authenticatedRequest(
      client.post('/physical-locations').json({}),
      account
    )

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('rejects invalid write payloads before creating location state', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()

    const missingReason = await authenticatedRequest(
      client.post('/physical-locations').json({ name: 'Main Campus' }),
      account
    )
    const invalidParent = await authenticatedRequest(
      client.post('/physical-locations').json({
        name: 'Administration Block',
        parentId: 'not-a-uuid',
        reason: 'Invalid parent identifier',
      }),
      account
    )

    missingReason.assertStatus(422)
    invalidParent.assertStatus(422)
    assert.lengthOf(await PhysicalLocation.all(), 0)
    assert.lengthOf(await AccessEvent.query().where('target_type', 'PHYSICAL_LOCATION'), 0)
  })

  test('creates top-level and nested locations with history, audit, and message-only responses', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()

    const topLevel = await authenticatedRequest(
      client.post('/physical-locations').json({
        name: 'Main Campus',
        reason: 'Establish the primary campus',
      }),
      account
    )
    topLevel.assertStatus(201)
    topLevel.assertBody({ message: 'Physical location created.' })

    const campus = await PhysicalLocation.findByOrFail('name', 'Main Campus')
    const nested = await authenticatedRequest(
      client.post('/physical-locations').json({
        name: 'Administration Block',
        parentId: campus.id,
        reason: 'Record the administration building',
      }),
      account
    )
    nested.assertStatus(201)
    nested.assertBody({ message: 'Physical location created.' })

    const block = await PhysicalLocation.findByOrFail('name', 'Administration Block')
    const blockVersion = await PhysicalLocationVersion.query()
      .where('physical_location_id', block.id)
      .firstOrFail()

    assert.equal(block.parentId, campus.id)
    assert.equal(Number(blockVersion.version), 1)
    const event = await AccessEvent.query()
      .where('event_type', 'PHYSICAL_LOCATION_CREATED')
      .where('target_id', block.id)
      .firstOrFail()
    assert.equal(event.actorAccountId, account.id)
    assert.equal(event.reason, 'Record the administration building')
    assert.equal(event.targetType, 'PHYSICAL_LOCATION')
  })

  test('enforces case-insensitive active sibling uniqueness including top-level locations', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    await createLocation('Central Store', null, account.id)

    const response = await authenticatedRequest(
      client.post('/physical-locations').json({
        name: 'central store',
        reason: 'Attempt duplicate top-level store',
      }),
      account
    )

    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_DUPLICATE' })
    assert.equal(
      await PhysicalLocation.query()
        .whereILike('name', 'central store')
        .count('* as total')
        .firstOrFail()
        .then((result) => Number(result.$extras.total)),
      1
    )
  })

  test('renames and reparents locations while preventing circular hierarchy changes', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    const campus = await createLocation('Main Campus', null, account.id)
    const block = await createLocation('Admin Block', campus.id, account.id)
    const room = await createLocation('Store Room', block.id, account.id)

    const circular = await authenticatedRequest(
      client.post(`/physical-locations/${campus.id}/reparent`).json({
        parentId: room.id,
        reason: 'Invalid circular move',
      }),
      account
    )
    circular.assertStatus(409)
    circular.assertBodyContains({ code: 'E_INVALID_PHYSICAL_LOCATION_CHANGE' })

    const promoted = await authenticatedRequest(
      client.post(`/physical-locations/${room.id}/reparent`).json({
        parentId: null,
        reason: 'Promote the store room to a top-level location',
      }),
      account
    )
    promoted.assertStatus(200)
    promoted.assertBody({ message: 'Physical location moved.' })

    const renamed = await authenticatedRequest(
      client.post(`/physical-locations/${room.id}/rename`).json({
        name: 'Central Store',
        reason: 'Use the approved store name',
      }),
      account
    )
    renamed.assertStatus(200)
    renamed.assertBody({ message: 'Physical location renamed.' })

    await room.refresh()
    assert.isNull(room.parentId)
    assert.equal(room.name, 'Central Store')
    const versions = await PhysicalLocationVersion.query()
      .where('physical_location_id', room.id)
      .orderBy('version', 'asc')
    assert.deepEqual(
      versions.map((version) => ({
        version: Number(version.version),
        name: version.name,
        parentId: version.parentId,
      })),
      [
        { version: 1, name: 'Store Room', parentId: block.id },
        { version: 2, name: 'Store Room', parentId: null },
        { version: 3, name: 'Central Store', parentId: null },
      ]
    )
  })

  test('archives children before parents and restores parents before children', async ({
    client,
    assert,
  }) => {
    const { account } = await createRootActor()
    const campus = await createLocation('Main Campus', null, account.id)
    const block = await createLocation('Administration Block', campus.id, account.id)

    const blockedParent = await authenticatedRequest(
      client.post(`/physical-locations/${campus.id}/archive`).json({
        reason: 'Attempt to archive an occupied branch',
      }),
      account
    )
    blockedParent.assertStatus(409)

    const childArchive = await authenticatedRequest(
      client.post(`/physical-locations/${block.id}/archive`).json({
        reason: 'Archive the former administration block',
      }),
      account
    )
    childArchive.assertStatus(200)

    const parentArchive = await authenticatedRequest(
      client.post(`/physical-locations/${campus.id}/archive`).json({
        reason: 'Archive the former campus',
      }),
      account
    )
    parentArchive.assertStatus(200)

    const blockedChildRestore = await authenticatedRequest(
      client.post(`/physical-locations/${block.id}/restore`).json({
        reason: 'Attempt child-first restoration',
      }),
      account
    )
    blockedChildRestore.assertStatus(409)

    const parentRestore = await authenticatedRequest(
      client.post(`/physical-locations/${campus.id}/restore`).json({
        reason: 'Restore the campus',
      }),
      account
    )
    parentRestore.assertStatus(200)

    const childRestore = await authenticatedRequest(
      client.post(`/physical-locations/${block.id}/restore`).json({
        reason: 'Restore the administration block',
      }),
      account
    )
    childRestore.assertStatus(200)

    await campus.refresh()
    await block.refresh()
    assert.isNull(campus.archivedAt)
    assert.isNull(block.archivedAt)
  })

  test('transactionally rejects an actor whose root authority expired after authorization', async ({
    assert,
  }) => {
    const { account, assignment } = await createRootActor()
    await assignment.merge({ expiresAt: DateTime.now().minus({ seconds: 1 }) }).save()
    const service = await app.container.make(PhysicalLocationProvisioningService)

    try {
      await service.create(
        { name: 'Rejected Location', reason: 'Stale administrator request' },
        account.id
      )
      assert.fail('Expected expired root authority to reject physical-location provisioning')
    } catch (error) {
      assert.instanceOf(error, AccessAuthorityChangedException)
    }
    assert.isNull(await PhysicalLocation.findBy('name', 'Rejected Location'))
  })

  test('serializes concurrent duplicate creation and commits exactly one location', async ({
    assert,
  }) => {
    const { account } = await createRootActor()
    const service = await app.container.make(PhysicalLocationProvisioningService)

    const results = await Promise.allSettled([
      service.create({ name: 'Central Store', reason: 'First concurrent request' }, account.id),
      service.create({ name: 'central store', reason: 'Second concurrent request' }, account.id),
    ])

    assert.lengthOf(
      results.filter((result) => result.status === 'fulfilled'),
      1
    )
    const rejected = results.find((result) => result.status === 'rejected')
    assert.instanceOf(rejected?.status === 'rejected' ? rejected.reason : null, DuplicateException)
    assert.lengthOf(await PhysicalLocation.all(), 1)
    assert.lengthOf(await PhysicalLocationVersion.all(), 1)
    assert.lengthOf(await AccessEvent.query().where('event_type', 'PHYSICAL_LOCATION_CREATED'), 1)
  })

  test('rolls back creation when its audit event cannot be persisted', async ({ assert }) => {
    const { account } = await createRootActor()
    const service = await app.container.make(PhysicalLocationProvisioningService)

    await assert.rejects(() =>
      service.create(
        { name: 'Atomic Location', reason: 'Verify atomic audit persistence' },
        account.id,
        { ip: 'not-an-ip-address', requestId: 'physical-location-atomicity' }
      )
    )

    assert.isNull(await PhysicalLocation.findBy('name', 'Atomic Location'))
    assert.lengthOf(await PhysicalLocationVersion.all(), 0)
    assert.lengthOf(await AccessEvent.query().where('target_type', 'PHYSICAL_LOCATION'), 0)
  })
})
