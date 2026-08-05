import { test } from '@japa/runner'
import BaseUnit from '#models/base_unit'
import BaseUnitVersion from '#models/base_unit_version'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

test.group('Base units administration', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('creates countable and measured units with enforced default precision', async ({
    client,
    assert,
  }) => {
    const { account, assignment } = await createDirectCatalogueActor()

    const countable = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        reason: 'Create the piece unit',
      }),
      account
    )
    countable.assertStatus(201)

    const measured = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Litre',
        symbol: 'L',
        kind: 'MEASURED',
        reason: 'Create the litre unit',
      }),
      account
    )
    measured.assertStatus(201)

    const piece = await BaseUnit.findByOrFail('name', 'Piece')
    const litre = await BaseUnit.findByOrFail('name', 'Litre')
    assert.equal(Number(piece.precision), 0)
    assert.equal(Number(litre.precision), 3)

    const version = await BaseUnitVersion.findByOrFail('baseUnitId', litre.id)
    assert.equal(version.changeKind, 'CREATED')
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.equal(Number(version.precision), 3)
  })

  test('rejects incompatible countable and measured precision', async ({ client }) => {
    const { account } = await createDirectCatalogueActor()

    const fractionalCount = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        precision: 1,
        reason: 'Attempt fractional pieces',
      }),
      account
    )
    fractionalCount.assertStatus(409)
    fractionalCount.assertBodyContains({ code: 'E_INVALID_BASE_UNIT_CHANGE' })

    const wholeMeasurement = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Litre',
        symbol: 'L',
        kind: 'MEASURED',
        precision: 0,
        reason: 'Attempt measured unit without decimals',
      }),
      account
    )
    wholeMeasurement.assertStatus(409)
  })

  test('enforces case-insensitive active name and symbol uniqueness', async ({ client }) => {
    const { account } = await createDirectCatalogueActor()
    await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        reason: 'Create piece',
      }),
      account
    )

    const duplicateName = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'piece',
        symbol: 'item',
        kind: 'COUNTABLE',
        reason: 'Attempt duplicate name',
      }),
      account
    )
    duplicateName.assertStatus(409)

    const duplicateSymbol = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Pack',
        symbol: 'PC',
        kind: 'COUNTABLE',
        reason: 'Attempt duplicate symbol',
      }),
      account
    )
    duplicateSymbol.assertStatus(409)
  })

  test('versions details and lifecycle while enforcing restore conflicts', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Meter',
        symbol: 'm',
        kind: 'MEASURED',
        precision: 2,
        reason: 'Create imported spelling',
      }),
      account
    )
    const unit = await BaseUnit.findByOrFail('name', 'Meter')

    const update = await authenticatedCatalogueRequest(
      client.post(`/base-units/${unit.id}/details`).json({
        name: 'Metre',
        symbol: 'm',
        kind: 'MEASURED',
        precision: 3,
        reason: 'Use the approved spelling and precision',
      }),
      account
    )
    update.assertStatus(200)

    const archive = await authenticatedCatalogueRequest(
      client.post(`/base-units/${unit.id}/archive`).json({ reason: 'Retire metre temporarily' }),
      account
    )
    archive.assertStatus(200)

    await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Metre',
        symbol: 'm',
        kind: 'MEASURED',
        precision: 3,
        reason: 'Create replacement metre',
      }),
      account
    )

    const blockedRestore = await authenticatedCatalogueRequest(
      client.post(`/base-units/${unit.id}/restore`).json({ reason: 'Attempt conflicting restore' }),
      account
    )
    blockedRestore.assertStatus(409)

    const versions = await BaseUnitVersion.query()
      .where('base_unit_id', unit.id)
      .orderBy('version', 'asc')
    assert.deepEqual(
      versions.map(({ changeKind }) => changeKind),
      ['CREATED', 'DETAILS_UPDATED', 'ARCHIVED']
    )
  })

  test('serializes concurrent active unit duplicates', async ({ client, assert }) => {
    const { account } = await createDirectCatalogueActor()
    const responses = await Promise.all(
      ['First request', 'Second request'].map((reason) =>
        authenticatedCatalogueRequest(
          client.post('/base-units').json({
            name: 'Piece',
            symbol: 'pc',
            kind: 'COUNTABLE',
            reason,
          }),
          account
        )
      )
    )

    const created = responses.find((response) => response.body().message === 'Base unit created.')
    const duplicate = responses.find((response) => response.body().code === 'E_DUPLICATE')
    created?.assertStatus(201)
    duplicate?.assertStatus(409)
    assert.exists(created)
    assert.exists(duplicate)
  })
})
