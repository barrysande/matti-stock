import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import CentralStoreAuthorityChangedException from '#exceptions/central_store_authority_changed_exception'
import RoleAssignmentTermination from '#models/role_assignment_termination'
import CentralStoreAuthorityService from '#services/central_store_authority_service'
import {
  authenticatedCentralStoreRequest,
  cleanupCentralStoreTables,
  configureCentralStore,
  createCentralStoreIntakeActor,
  createCentralStoreRoot,
  createCentralStoreStructure,
  createDelegatedCentralStoreActor,
} from '#tests/helpers/central_store'

test.group('Central Store authority', (group) => {
  group.each.setup(cleanupCentralStoreTables)

  test('accepts institution-descendant and exact Central Store grants', async ({
    client,
    assert,
  }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const root = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, root.account, storeUnit.id, storeLocation.id)
    const actor = await createCentralStoreIntakeActor(institute.id)

    const context = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      actor.account
    )
    context.assertStatus(200)

    const currentAccount = await authenticatedCentralStoreRequest(
      client.get('/auth/me'),
      actor.account
    )
    currentAccount.assertStatus(200)
    currentAccount.assertBodyContains({ data: { canRecordIntake: true } })

    await actor.assignment
      .merge({ scopeOrgUnitId: storeUnit.id, scopeMode: 'THIS_NODE_ONLY' })
      .save()
    const exactContext = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      actor.account
    )
    exactContext.assertStatus(200)

    const service = await app.container.make(CentralStoreAuthorityService)
    const authorization = await db.transaction((trx) =>
      service.authorizeIntake(trx, actor.account.id, DateTime.now())
    )
    assert.equal(authorization.context.custodialOrganizationalUnitId, storeUnit.id)
    assert.equal(authorization.grant.assignmentId, actor.assignment.id)
    assert.isNull(authorization.grant.delegationId)
  })

  test('accepts a valid whole-role delegation', async ({ client }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const root = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, root.account, storeUnit.id, storeLocation.id)
    const actor = await createDelegatedCentralStoreActor(storeUnit.id)
    const response = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      actor.delegate
    )

    response.assertStatus(200)
    const currentAccount = await authenticatedCentralStoreRequest(
      client.get('/auth/me'),
      actor.delegate
    )
    currentAccount.assertBodyContains({ data: { canRecordIntake: true } })
  })

  test('rejects a sibling organizational scope', async ({ client }) => {
    const { institute, siblingUnit, storeLocation, storeUnit } = await createCentralStoreStructure()
    const root = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, root.account, storeUnit.id, storeLocation.id)
    const actor = await createCentralStoreIntakeActor(siblingUnit.id)
    const response = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      actor.account
    )

    response.assertStatus(403)
    const currentAccount = await authenticatedCentralStoreRequest(
      client.get('/auth/me'),
      actor.account
    )
    currentAccount.assertBodyContains({ data: { canRecordIntake: false } })
  })

  test('reports the exact transactional authority failure', async ({ client, assert }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const actor = await createCentralStoreIntakeActor(storeUnit.id)
    const service = await app.container.make(CentralStoreAuthorityService)

    try {
      await db.transaction((trx) => service.authorizeIntake(trx, actor.account.id, DateTime.now()))
      assert.fail('Expected a missing Central Store context to reject intake authority')
    } catch (error) {
      assert.instanceOf(error, CentralStoreAuthorityChangedException)
      assert.equal((error as Error).message, 'The Central Store context is not configured.')
    }

    const root = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, root.account, storeUnit.id, storeLocation.id)
    await actor.assignment.merge({ expiresAt: DateTime.now().minus({ seconds: 1 }) }).save()

    try {
      await db.transaction((trx) => service.authorizeIntake(trx, actor.account.id, DateTime.now()))
      assert.fail('Expected expired intake authority to reject the transaction')
    } catch (error) {
      assert.instanceOf(error, CentralStoreAuthorityChangedException)
      assert.equal(
        (error as Error).message,
        'The acting account no longer has intake.record authority for the configured Central Store custodial organizational unit.'
      )
    }
  })

  test('rejects inactive account, assignment, role, and scope states', async ({ client }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const root = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, root.account, storeUnit.id, storeLocation.id)
    const actor = await createCentralStoreIntakeActor(storeUnit.id, {
      scopeMode: 'THIS_NODE_ONLY',
    })
    const request = () =>
      authenticatedCentralStoreRequest(client.get('/central-store-context'), actor.account)

    const active = await request()
    active.assertStatus(200)

    await actor.assignment.merge({ expiresAt: DateTime.now().minus({ seconds: 1 }) }).save()
    const expired = await request()
    expired.assertStatus(403)

    await actor.assignment
      .merge({
        startsAt: DateTime.now().plus({ days: 1 }),
        expiresAt: null,
      })
      .save()
    const future = await request()
    future.assertStatus(403)

    await actor.assignment.merge({ startsAt: DateTime.now().minus({ minutes: 1 }) }).save()
    await actor.account.merge({ status: 'SUSPENDED' }).save()
    const suspended = await request()
    suspended.assertStatus(401)

    await actor.account.merge({ status: 'ACTIVE' }).save()
    await actor.role.merge({ archivedAt: DateTime.now() }).save()
    const archivedRole = await request()
    archivedRole.assertStatus(403)

    await actor.role.merge({ archivedAt: null }).save()
    await storeUnit.merge({ archivedAt: DateTime.now() }).save()
    const archivedScope = await request()
    archivedScope.assertStatus(403)

    await storeUnit.merge({ archivedAt: null }).save()
    await RoleAssignmentTermination.create({
      assignmentId: actor.assignment.id,
      kind: 'ENDED',
      effectiveAt: DateTime.now().minus({ seconds: 1 }),
      replacementAssignmentId: null,
      terminatedByAccountId: root.account.id,
      reason: 'End test authority',
    })
    const terminated = await request()
    terminated.assertStatus(403)
  })
})
