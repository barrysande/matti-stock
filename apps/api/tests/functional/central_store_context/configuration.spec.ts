import { test } from '@japa/runner'
import CentralStoreContextVersion from '#models/central_store_context_version'
import OrganizationalUnit from '#models/organizational_unit'
import PhysicalLocation from '#models/physical_location'
import {
  authenticatedCentralStoreRequest,
  cleanupCentralStoreTables,
  configureCentralStore,
  createCentralStoreAccount,
  createCentralStoreRoot,
  createCentralStoreStructure,
} from '#tests/helpers/central_store'

test.group('Central Store context configuration', (group) => {
  group.each.setup(cleanupCentralStoreTables)

  test('authorizes configuration before validation or record lookup', async ({ client }) => {
    const ordinary = await createCentralStoreAccount('Ordinary Context User')
    const anonymous = await client.post('/central-store-context').json({})
    const unauthorized = await authenticatedCentralStoreRequest(
      client.post('/central-store-context').json({
        custodialOrganizationalUnitId: '00000000-0000-4000-8000-000000000000',
        physicalLocationId: '00000000-0000-4000-8000-000000000000',
        reason: '',
      }),
      ordinary
    )

    anonymous.assertStatus(401)
    unauthorized.assertStatus(403)
  })

  test('returns an empty initial context to root authority', async ({ client }) => {
    const { institute } = await createCentralStoreStructure()
    const { account } = await createCentralStoreRoot(institute.id)
    const response = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      account
    )

    response.assertStatus(200)
    response.assertBody({ data: null })
  })

  test('appends immediate versions and returns the current context and history', async ({
    client,
    assert,
  }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const { account } = await createCentralStoreRoot(institute.id)

    const first = await configureCentralStore(client, account, storeUnit.id, storeLocation.id)
    first.assertBodyContains({
      data: {
        version: 1,
        custodialOrganizationalUnit: { id: storeUnit.id, name: 'Central Store' },
        physicalLocation: { id: storeLocation.id, name: 'Central Store' },
      },
    })

    const replacement = await PhysicalLocation.create({
      name: 'Main Warehouse',
      parentId: null,
      archivedAt: null,
    })
    const second = await authenticatedCentralStoreRequest(
      client.post('/central-store-context').json({
        custodialOrganizationalUnitId: storeUnit.id,
        physicalLocationId: replacement.id,
        reason: 'Move intake to the replacement warehouse',
      }),
      account
    )
    second.assertStatus(200)
    second.assertBodyContains({ data: { version: 2 } })

    const current = await authenticatedCentralStoreRequest(
      client.get('/central-store-context'),
      account
    )
    current.assertStatus(200)
    current.assertBodyContains({
      data: { version: 2, reason: 'Move intake to the replacement warehouse' },
    })

    const history = await authenticatedCentralStoreRequest(
      client.get('/central-store-context/history'),
      account
    )
    history.assertStatus(200)
    assert.deepEqual(
      history.body().data.map((context: { version: number }) => context.version),
      [2, 1]
    )
    assert.equal(history.body().metadata.currentPage, 1)
    assert.equal(
      await CentralStoreContextVersion.query()
        .count('* as total')
        .then(([row]) => Number(row.$extras.total)),
      2
    )
  })

  test('rejects inactive references and a duplicate current selection', async ({ client }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const { account } = await createCentralStoreRoot(institute.id)
    const archivedUnit = await OrganizationalUnit.create({
      name: 'Retired Store',
      unitType: 'DEPARTMENT',
      parentId: institute.id,
      archivedAt: storeUnit.createdAt,
    })
    const archivedLocation = await PhysicalLocation.create({
      name: 'Retired Warehouse',
      parentId: null,
      archivedAt: storeLocation.createdAt,
    })

    const inactiveUnit = await authenticatedCentralStoreRequest(
      client.post('/central-store-context').json({
        custodialOrganizationalUnitId: archivedUnit.id,
        physicalLocationId: storeLocation.id,
        reason: 'Attempt inactive unit',
      }),
      account
    )
    inactiveUnit.assertStatus(409)

    const inactiveLocation = await authenticatedCentralStoreRequest(
      client.post('/central-store-context').json({
        custodialOrganizationalUnitId: storeUnit.id,
        physicalLocationId: archivedLocation.id,
        reason: 'Attempt inactive location',
      }),
      account
    )
    inactiveLocation.assertStatus(409)

    await configureCentralStore(client, account, storeUnit.id, storeLocation.id)
    const duplicate = await authenticatedCentralStoreRequest(
      client.post('/central-store-context').json({
        custodialOrganizationalUnitId: storeUnit.id,
        physicalLocationId: storeLocation.id,
        reason: 'Repeat current selection',
      }),
      account
    )
    duplicate.assertStatus(409)
  })

  test('blocks archival of both configured records', async ({ client }) => {
    const { institute, storeLocation, storeUnit } = await createCentralStoreStructure()
    const { account } = await createCentralStoreRoot(institute.id)

    await configureCentralStore(client, account, storeUnit.id, storeLocation.id)

    const locationArchive = await authenticatedCentralStoreRequest(
      client.post(`/physical-locations/${storeLocation.id}/archive`).json({
        reason: 'Attempt to retire the configured location',
      }),
      account
    )
    locationArchive.assertStatus(409)

    const preview = await authenticatedCentralStoreRequest(
      client.post(`/organizational-units/${storeUnit.id}/access-impact`).json({
        operation: 'ARCHIVE',
      }),
      account
    )
    preview.assertStatus(200)
    const unitArchive = await authenticatedCentralStoreRequest(
      client.post(`/organizational-units/${storeUnit.id}/archive`).json({
        reason: 'Attempt to retire the configured custodian',
        impactFingerprint: preview.body().fingerprint,
      }),
      account
    )
    unitArchive.assertStatus(409)
  })
})
