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
    assert.deepEqual(
      detail.body().data.versions.map((version: { changeKind: string }) => version.changeKind),
      ['ARCHIVED', 'CREATED']
    )
    assert.equal(detail.body().data.versions[0].authorization.roleAssignmentId, assignment.id)
    assert.notProperty(detail.body().data.versions[0], 'authorizationRoleAssignment')
  })
})
