import { test } from '@japa/runner'
import BaseUnit from '#models/base_unit'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

test.group('Base units directory', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('supports ordinary authenticated reads, filters, archived visibility, and history', async ({
    client,
    assert,
  }) => {
    const { account: manager, assignment } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Base Unit Reader')

    await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        reason: 'Create piece',
      }),
      manager
    )
    await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Litre',
        symbol: 'L',
        kind: 'MEASURED',
        precision: 2,
        reason: 'Create litre',
      }),
      manager
    )
    const litre = await BaseUnit.findByOrFail('name', 'Litre')
    await authenticatedCatalogueRequest(
      client.post(`/base-units/${litre.id}/archive`).json({ reason: 'Retire litre' }),
      manager
    )

    const active = await authenticatedCatalogueRequest(client.get('/base-units'), reader)
    active.assertStatus(200)
    assert.deepEqual(
      active.body().data.map((unit: { name: string }) => unit.name),
      ['Piece']
    )

    const archivedMeasured = await authenticatedCatalogueRequest(
      client.get('/base-units').qs({ includeArchived: true, kind: 'MEASURED', search: 'lit' }),
      reader
    )
    archivedMeasured.assertStatus(200)
    assert.equal(archivedMeasured.body().data[0].name, 'Litre')

    const detail = await authenticatedCatalogueRequest(
      client.get(`/base-units/${litre.id}`),
      reader
    )
    detail.assertStatus(200)
    assert.notProperty(detail.body().data, 'versions')

    const history = await authenticatedCatalogueRequest(
      client.get(`/base-units/${litre.id}/history`),
      reader
    )
    history.assertStatus(200)
    assert.deepEqual(
      history.body().data.map((version: { changeKind: string }) => version.changeKind),
      ['ARCHIVED', 'CREATED']
    )
    assert.equal(history.body().data[0].authorization.roleAssignmentId, assignment.id)
    assert.notProperty(history.body().data[0], 'authorizationRoleAssignment')
    assert.equal(history.body().metadata.currentPage, 1)
  })

  test('paginates the directory and keeps selector options complete', async ({ client, assert }) => {
    const reader = await createCatalogueAccount('Paged Base Unit Reader')

    for (let index = 1; index <= 21; index += 1) {
      await BaseUnit.create({
        name: `Paged unit ${String(index).padStart(2, '0')}`,
        symbol: `p${index}`,
        kind: 'COUNTABLE',
        precision: 0,
      })
    }

    const directory = await authenticatedCatalogueRequest(
      client.get('/base-units').qs({ page: 2 }),
      reader
    )
    directory.assertStatus(200)
    assert.lengthOf(directory.body().data, 1)
    assert.equal(directory.body().metadata.currentPage, 2)
    assert.equal(directory.body().metadata.lastPage, 2)

    const options = await authenticatedCatalogueRequest(client.get('/base-units/options'), reader)
    options.assertStatus(200)
    assert.lengthOf(options.body().data, 21)
    assert.notProperty(options.body(), 'metadata')
  })
})
