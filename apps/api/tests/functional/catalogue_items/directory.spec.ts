import { test } from '@japa/runner'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createCatalogueClassification,
  createCatalogueItem,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

test.group('Catalogue item directory', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('supports authenticated directory, exact-code lookup ranking, and canonical detail', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Catalogue Reader')
    const { category, baseUnit } = await createCatalogueClassification('Stores')
    const item = await createCatalogueItem(client, account, category, baseUnit, {
      name: 'A4 Printing Paper',
      keywords: ['A4 paper', 'printing'],
      stockType: 'CONSUMABLE',
    })

    const directory = await authenticatedCatalogueRequest(client.get('/catalogue-items'), reader)
    directory.assertStatus(200)
    assert.equal(directory.body().data[0].catalogueCode, item.catalogueCode)
    assert.notProperty(directory.body().data[0], 'id')

    const lookup = await authenticatedCatalogueRequest(
      client.get('/catalogue-items/lookup').qs({ query: item.catalogueCode }),
      reader
    )
    lookup.assertStatus(200)
    assert.equal(lookup.body().data[0].matchKind, 'EXACT_CODE')
    assert.equal(lookup.body().data[0].catalogueCode, item.catalogueCode)

    const details = await authenticatedCatalogueRequest(
      client.get(`/catalogue-items/${item.catalogueCode}`),
      reader
    )
    details.assertStatus(200)
    assert.equal(details.body().data.catalogueCode, item.catalogueCode)
    assert.notProperty(details.body().data, 'id')
    assert.notProperty(details.body().data, 'versions')

    const history = await authenticatedCatalogueRequest(
      client.get(`/catalogue-items/${item.catalogueCode}/history`),
      reader
    )
    history.assertStatus(200)
    assert.lengthOf(history.body().data, 1)
    assert.equal(history.body().metadata.currentPage, 1)
  })

  test('hides archived items from current lists while preserving canonical detail access', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Archived Catalogue Reader')
    const { category, baseUnit } = await createCatalogueClassification('Archive')
    const item = await createCatalogueItem(client, account, category, baseUnit)
    const archive = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-items/${item.catalogueCode}/archive`)
        .json({ reason: 'Stop new intake from this definition' }),
      account
    )
    archive.assertStatus(200)

    const current = await authenticatedCatalogueRequest(client.get('/catalogue-items'), reader)
    current.assertStatus(200)
    assert.lengthOf(current.body().data, 0)
    const withArchived = await authenticatedCatalogueRequest(
      client.get('/catalogue-items').qs({ includeArchived: true }),
      reader
    )
    assert.equal(withArchived.body().data[0].catalogueCode, item.catalogueCode)
    const details = await authenticatedCatalogueRequest(
      client.get(`/catalogue-items/${item.catalogueCode}`),
      reader
    )
    details.assertStatus(200)
    assert.isNotNull(details.body().data.archivedAt)
  })
})
