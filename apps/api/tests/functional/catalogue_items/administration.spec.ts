import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CatalogueItemAttributeValue from '#models/catalogue_item_attribute_value'
import CatalogueItemVersion from '#models/catalogue_item_version'
import CategoryAttribute from '#models/category_attribute'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueClassification,
  createCatalogueItem,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

test.group('Catalogue item administration', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('keeps descriptive corrections available with complete version history', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Computers')
    const item = await createCatalogueItem(client, account, category, baseUnit, {
      name: 'HP Probook 450 GB',
      keywords: ['HP laptop'],
    })
    const review = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/change-review`).json({
        name: 'HP ProBook 450 G8 Laptop',
        keywords: ['HP laptop', 'ProBook G8'],
        catalogueCategoryId: category.id,
        stockType: 'FIXED_NON_CONSUMABLE',
      }),
      account
    )
    review.assertStatus(200)
    const response = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/details`).json({
        name: 'HP ProBook 450 G8 Laptop',
        description: 'Correct model verified from physical inspection.',
        keywords: ['HP laptop', 'ProBook G8'],
        identificationStatus: 'CONFIRMED',
        reviewFingerprint: review.body().data.fingerprint,
        confirmedNotInterchangeable: true,
        similarityReason: 'No shown candidate represents this exact model.',
        reason: 'Correct a transposed model entry',
      }),
      account
    )
    response.assertStatus(200)
    await item.refresh()
    assert.equal(item.name, 'HP ProBook 450 G8 Laptop')
    assert.equal(
      await CatalogueItemVersion.query()
        .where('catalogue_item_id', item.id)
        .count('* as total')
        .then((r) => Number(r[0].$extras.total)),
      2
    )
  })

  test('keeps the permanent catalogue code immutable at the database boundary', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Identity')
    const item = await createCatalogueItem(client, account, category, baseUnit)
    const originalCode = item.catalogueCode
    await assert.rejects(() => item.merge({ catalogueCode: 'ITEM-999999' }).save())
    await item.refresh()
    assert.equal(item.catalogueCode, originalCode)
  })

  test('blocks semantic edits after first holding while allowing category correction', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const first = await createCatalogueClassification('Furniture')
    const second = await createCatalogueClassification('Office furniture')
    const item = await createCatalogueItem(client, account, first.category, first.baseUnit)
    await item.merge({ inventorySemanticsLockedAt: DateTime.now() }).save()

    const blocked = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/classification`).json({
        catalogueCategoryId: first.category.id,
        stockType: 'CONSUMABLE',
        trackingMethod: 'QUANTITY',
        trackingMethodConfirmed: true,
        baseUnitId: first.baseUnit.id,
        attributeValues: [],
        acknowledgedRemovedAttributeValueIds: [],
        reason: 'Attempt unsafe semantic rewrite',
      }),
      account
    )
    blocked.assertStatus(409)
    blocked.assertBodyContains({ code: 'E_CATALOGUE_ITEM_SEMANTICS_LOCKED' })

    const review = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/change-review`).json({
        name: item.name,
        keywords: ['wooden chair', 'armless'],
        catalogueCategoryId: second.category.id,
        stockType: 'FIXED_NON_CONSUMABLE',
      }),
      account
    )
    const corrected = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/classification`).json({
        catalogueCategoryId: second.category.id,
        stockType: 'FIXED_NON_CONSUMABLE',
        trackingMethod: 'QUANTITY',
        trackingMethodConfirmed: true,
        baseUnitId: first.baseUnit.id,
        attributeValues: [],
        acknowledgedRemovedAttributeValueIds: [],
        reviewFingerprint: review.body().data.fingerprint,
        confirmedNotInterchangeable: true,
        similarityReason: 'The corrected category does not make this item interchangeable.',
        reason: 'Correct category after reviewing the physical item',
      }),
      account
    )
    corrected.assertStatus(200)
    await item.refresh()
    assert.equal(item.catalogueCategoryId, second.category.id)
  })

  test('uses explicit set and remove operations without treating omission as deletion', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Tools')
    const material = await CategoryAttribute.create({
      catalogueCategoryId: category.id,
      name: 'Material',
      description: null,
      dataType: 'TEXT',
      isRequired: false,
      scope: 'CATALOGUE',
      semanticsLockedAt: null,
      archivedAt: null,
    })
    const item = await createCatalogueItem(client, account, category, baseUnit)
    const set = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/attribute-values`).json({
        changes: [{ operation: 'SET', categoryAttributeId: material.id, textValue: 'Wood' }],
        reason: 'Record a useful controlled characteristic',
      }),
      account
    )
    set.assertStatus(200)
    const currentValue = await CatalogueItemAttributeValue.firstOrFail()
    assert.equal(currentValue.textValue, 'Wood')

    const remove = await authenticatedCatalogueRequest(
      client.post(`/catalogue-items/${item.catalogueCode}/attribute-values`).json({
        changes: [{ operation: 'REMOVE', categoryAttributeId: material.id }],
        reason: 'Remove an incorrect optional value',
      }),
      account
    )
    remove.assertStatus(200)
    assert.equal(
      await CatalogueItemAttributeValue.query()
        .count('* as total')
        .then((r) => Number(r[0].$extras.total)),
      0
    )
    assert.equal(
      await CatalogueItemVersion.query()
        .where('catalogue_item_id', item.id)
        .count('* as total')
        .then((r) => Number(r[0].$extras.total)),
      3
    )
  })

  test('requires authorization before validation or catalogue-code lookup', async ({ client }) => {
    const reader = await createDirectCatalogueActor('DEPARTMENT')
    const forbiddenCreate = await authenticatedCatalogueRequest(
      client.post('/catalogue-items').json({}),
      reader.account
    )
    forbiddenCreate.assertStatus(403)
    const forbiddenEdit = await authenticatedCatalogueRequest(
      client.post('/catalogue-items/ITEM-999999/details').json({}),
      reader.account
    )
    forbiddenEdit.assertStatus(403)
  })
})
