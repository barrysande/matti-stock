import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CatalogueItem from '#models/catalogue_item'
import CatalogueItemVersion from '#models/catalogue_item_version'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueClassification,
  createCatalogueItem,
  createDelegatedCatalogueActor,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

test.group('Catalogue item creation', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('creates a permanent code, current projection, and attributed initial version', async ({
    client,
    assert,
  }) => {
    const { account, assignment } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Furniture')
    const item = await createCatalogueItem(client, account, category, baseUnit)

    assert.match(item.catalogueCode, /^ITEM-\d{6}$/)
    assert.equal(item.normalizedName, 'wooden chair — armless')
    assert.isNull(item.inventorySemanticsLockedAt)
    await baseUnit.refresh()
    assert.isTrue(DateTime.isDateTime(baseUnit.firstUsedAt))

    const version = await CatalogueItemVersion.findByOrFail('catalogueItemId', item.id)
    assert.equal(version.changeKind, 'CREATED')
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.equal(version.permissionKey, 'catalogue.manage')
  })

  test('retains the exact delegated catalogue grant in item history', async ({
    client,
    assert,
  }) => {
    const { delegate, delegation, assignment } = await createDelegatedCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Delegated')
    const item = await createCatalogueItem(client, delegate, category, baseUnit)
    const version = await CatalogueItemVersion.findByOrFail('catalogueItemId', item.id)
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.equal(version.authorizationDelegationId, delegation.id)
    assert.equal(version.permissionKey, 'catalogue.manage')
  })

  test('hard-blocks normalized names even after the existing item is archived', async ({
    client,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Furniture')
    const item = await createCatalogueItem(client, account, category, baseUnit)
    await item.merge({ archivedAt: DateTime.now() }).save()

    const review = await authenticatedCatalogueRequest(
      client.post('/catalogue-items/creation-review').json({
        name: '  WOODEN   CHAIR — ARMLESS ',
        keywords: [],
        catalogueCategoryId: category.id,
        stockType: 'FIXED_NON_CONSUMABLE',
      }),
      account
    )
    review.assertStatus(200)
    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-items').json({
        name: '  WOODEN   CHAIR — ARMLESS ',
        description: null,
        keywords: [],
        catalogueCategoryId: category.id,
        stockType: 'FIXED_NON_CONSUMABLE',
        trackingMethod: 'QUANTITY',
        trackingMethodConfirmed: true,
        baseUnitId: baseUnit.id,
        identificationStatus: 'CONFIRMED',
        reviewFingerprint: review.body().data.fingerprint,
        reason: 'Attempt duplicate definition',
      }),
      account
    )
    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_DUPLICATE' })
  })

  test('requires explicit review confirmation and reason for similar candidates', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Computers')
    await createCatalogueItem(client, account, category, baseUnit, {
      name: 'HP ProBook 450 G8 Laptop',
      keywords: ['HP', 'ProBook'],
    })
    const proposal = {
      name: 'HP ProBook 450 G8 Notebook',
      keywords: ['HP', 'ProBook'],
      catalogueCategoryId: category.id,
      stockType: 'FIXED_NON_CONSUMABLE' as const,
    }
    const review = await authenticatedCatalogueRequest(
      client.post('/catalogue-items/creation-review').json(proposal),
      account
    )
    review.assertStatus(200)
    assert.isAbove(review.body().data.candidates.length, 0)

    const basePayload = {
      ...proposal,
      description: 'A non-interchangeable institute notebook configuration.',
      trackingMethod: 'INDIVIDUAL',
      trackingMethodConfirmed: true,
      baseUnitId: baseUnit.id,
      identificationStatus: 'CONFIRMED',
      reviewFingerprint: review.body().data.fingerprint,
      reason: 'Create distinct notebook definition',
    }
    const unconfirmed = await authenticatedCatalogueRequest(
      client.post('/catalogue-items').json(basePayload),
      account
    )
    unconfirmed.assertStatus(409)
    unconfirmed.assertBodyContains({ code: 'E_CATALOGUE_ITEM_REVIEW_REQUIRED' })

    const confirmed = await authenticatedCatalogueRequest(
      client.post('/catalogue-items').json({
        ...basePayload,
        confirmedNotInterchangeable: true,
        similarityReason: 'This notebook has a distinct managed hardware configuration.',
      }),
      account
    )
    confirmed.assertStatus(201)
  })

  test('serializes concurrent creation against a stale similarity review', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const { category, baseUnit } = await createCatalogueClassification('Stores')
    const proposal = {
      name: 'A4 Printing Paper',
      keywords: ['A4 paper'],
      catalogueCategoryId: category.id,
      stockType: 'CONSUMABLE' as const,
    }
    const review = await authenticatedCatalogueRequest(
      client.post('/catalogue-items/creation-review').json(proposal),
      account
    )
    const payload = {
      ...proposal,
      description: 'General-purpose A4 printing paper.',
      trackingMethod: 'QUANTITY',
      trackingMethodConfirmed: true,
      baseUnitId: baseUnit.id,
      identificationStatus: 'CONFIRMED',
      reviewFingerprint: review.body().data.fingerprint,
      reason: 'Create paper definition',
    }
    const responses = await Promise.all(
      [1, 2].map(() =>
        authenticatedCatalogueRequest(client.post('/catalogue-items').json(payload), account)
      )
    )
    assert.exists(responses.find((response) => response.status() === 201))
    assert.exists(
      responses.find((response) =>
        ['E_CATALOGUE_ITEM_MUTATION_BUSY', 'E_CATALOGUE_ITEM_REVIEW_REQUIRED'].includes(
          response.body().code
        )
      )
    )
    assert.equal(
      await CatalogueItem.query()
        .count('* as total')
        .then((r) => Number(r[0].$extras.total)),
      1
    )
  })
})
