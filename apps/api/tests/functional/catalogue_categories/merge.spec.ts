import { randomUUID } from 'node:crypto'
import type { ApiRequest } from '@japa/api-client'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import CatalogueItemVersion from '#models/catalogue_item_version'
import type UserAccount from '#models/user_account'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createCatalogueItem,
  createDelegatedCatalogueActor,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

async function createCategory(
  request: ApiRequest,
  account: UserAccount,
  name: string,
  parentId: string | null = null
) {
  const response = await authenticatedCatalogueRequest(
    request.json({
      name,
      description: `${name} classification description.`,
      parentId: parentId ?? undefined,
      reason: `Create ${name}`,
    }),
    account
  )

  response.assertStatus(201)

  const query = CatalogueCategory.query().where('name', name).whereNull('archived_at')

  parentId ? query.where('parent_id', parentId) : query.whereNull('parent_id')

  return query.firstOrFail()
}

function createBaseUnit(label: string) {
  return BaseUnit.create({
    name: `${label} piece`,
    symbol: `${label
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .slice(0, 12)}-pc`,
    kind: 'COUNTABLE',
    precision: 0,
    firstUsedAt: null,
    archivedAt: null,
  })
}

async function previewMerge(
  client: { post(path: string): ApiRequest },
  account: UserAccount,
  sourceId: string,
  targetId: string
) {
  const response = await authenticatedCatalogueRequest(
    client
      .post(`/catalogue-categories/${sourceId}/merge-preview`)
      .json({ targetCategoryId: targetId }),
    account
  )

  response.assertStatus(200)

  return response.body().data as {
    fingerprint: string
    ready: boolean
    activeChildren: Array<{ id: string; name: string }>
    affectedItems: Array<{ catalogueCode: string; name: string; archivedAt: string | null }>
  }
}

function mergeRequest(
  client: { post(path: string): ApiRequest },
  account: UserAccount,
  sourceId: string,
  targetId: string,
  previewFingerprint: string,
  reason = 'Consolidate duplicate catalogue classifications'
) {
  return authenticatedCatalogueRequest(
    client.post(`/catalogue-categories/${sourceId}/merge`).json({
      targetCategoryId: targetId,
      previewFingerprint,
      reason,
    }),
    account
  )
}

test.group('Catalogue category merge', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('previews blockers and rejects self, archived-target, and descendant merges', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const source = await createCategory(client.post('/catalogue-categories'), account, 'Computers')
    const child = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Notebooks',
      source.id
    )
    const target = await createCategory(client.post('/catalogue-categories'), account, 'Laptops')
    const blocked = await previewMerge(client, account, source.id, target.id)

    assert.isFalse(blocked.ready)
    assert.deepEqual(
      blocked.activeChildren.map(({ name }) => name),
      ['Notebooks']
    )

    const blockedApply = await mergeRequest(
      client,
      account,
      source.id,
      target.id,
      blocked.fingerprint
    )
    blockedApply.assertStatus(409)
    blockedApply.assertBodyContains({ code: 'E_INVALID_CATALOGUE_CATEGORY_MERGE' })

    const self = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${source.id}/merge-preview`)
        .json({ targetCategoryId: source.id }),
      account
    )
    self.assertStatus(409)

    const descendant = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${source.id}/merge-preview`)
        .json({ targetCategoryId: child.id }),
      account
    )
    descendant.assertStatus(409)

    await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${target.id}/archive`)
        .json({ reason: 'Retire target for rejection coverage' }),
      account
    )
    const archivedTarget = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${child.id}/merge-preview`)
        .json({ targetCategoryId: target.id }),
      account
    )
    archivedTarget.assertStatus(409)
  })

  test('moves active and archived items atomically with attributed histories', async ({
    client,
    assert,
  }) => {
    const { account, assignment } = await createDirectCatalogueActor()
    const source = await createCategory(client.post('/catalogue-categories'), account, 'Notebooks')
    const target = await createCategory(client.post('/catalogue-categories'), account, 'Laptops')
    const baseUnit = await createBaseUnit('Merge')
    const active = await createCatalogueItem(client, account, source, baseUnit, {
      name: 'HP ProBook 450 G8',
      description: '16 GB memory and 512 GB storage.',
      keywords: ['HP ProBook'],
    })
    const archived = await createCatalogueItem(client, account, source, baseUnit, {
      name: 'Dell Latitude E6410',
      description: 'Legacy laptop retained for historical reference.',
      keywords: ['Dell Latitude'],
    })
    const archivedAt = DateTime.now()

    await archived.merge({ archivedAt }).save()

    const preview = await previewMerge(client, account, source.id, target.id)

    assert.isTrue(preview.ready)
    assert.deepEqual(preview.affectedItems.map(({ name }) => name).sort(), [
      'Dell Latitude E6410',
      'HP ProBook 450 G8',
    ])

    const response = await mergeRequest(client, account, source.id, target.id, preview.fingerprint)
    response.assertStatus(200)
    response.assertBody({ message: 'Catalogue category merged.' })

    await Promise.all([source.refresh(), active.refresh(), archived.refresh()])
    assert.equal(source.mergedIntoCategoryId, target.id)
    assert.isTrue(DateTime.isDateTime(source.archivedAt))
    assert.equal(active.catalogueCategoryId, target.id)
    assert.equal(active.description, '16 GB memory and 512 GB storage.')
    assert.equal(archived.catalogueCategoryId, target.id)
    assert.equal(archived.archivedAt?.toISO(), archivedAt.toISO())

    const categoryVersion = await CatalogueCategoryVersion.query()
      .where('catalogue_category_id', source.id)
      .where('change_kind', 'MERGED')
      .firstOrFail()
    assert.equal(categoryVersion.mergedIntoCategoryId, target.id)
    assert.equal(categoryVersion.authorizationRoleAssignmentId, assignment.id)

    const itemVersions = await CatalogueItemVersion.query()
      .whereIn('catalogue_item_id', [active.id, archived.id])
      .where('change_kind', 'CATEGORY_MERGED')
    assert.lengthOf(itemVersions, 2)
    assert.isTrue(
      itemVersions.every((version) => version.authorizationRoleAssignmentId === assignment.id)
    )
  })

  test('rejects a stale preview after category or affected-item changes', async ({ client }) => {
    const { account } = await createDirectCatalogueActor()
    const source = await createCategory(client.post('/catalogue-categories'), account, 'Notebooks')
    const target = await createCategory(client.post('/catalogue-categories'), account, 'Laptops')
    const baseUnit = await createBaseUnit('Stale')
    const preview = await previewMerge(client, account, source.id, target.id)

    await createCatalogueItem(client, account, source, baseUnit, {
      name: 'Lenovo ThinkPad T14',
      keywords: ['ThinkPad'],
    })

    const response = await mergeRequest(client, account, source.id, target.id, preview.fingerprint)
    response.assertStatus(409)
    response.assertBodyContains({ code: 'E_STALE_CATALOGUE_CATEGORY_MERGE_PREVIEW' })
  })

  test('records delegated authority and follows a later merge to the canonical target', async ({
    client,
    assert,
  }) => {
    const { assignment, delegate, delegation } = await createDelegatedCatalogueActor()
    const source = await createCategory(client.post('/catalogue-categories'), delegate, 'Notebooks')
    const middle = await createCategory(client.post('/catalogue-categories'), delegate, 'Laptops')
    const final = await createCategory(
      client.post('/catalogue-categories'),
      delegate,
      'Portable Computers'
    )
    const firstPreview = await previewMerge(client, delegate, source.id, middle.id)
    const firstMerge = await mergeRequest(
      client,
      delegate,
      source.id,
      middle.id,
      firstPreview.fingerprint
    )
    firstMerge.assertStatus(200)

    const secondPreview = await previewMerge(client, delegate, middle.id, final.id)
    const secondMerge = await mergeRequest(
      client,
      delegate,
      middle.id,
      final.id,
      secondPreview.fingerprint
    )
    secondMerge.assertStatus(200)

    const firstVersion = await CatalogueCategoryVersion.query()
      .where('catalogue_category_id', source.id)
      .where('change_kind', 'MERGED')
      .firstOrFail()
    assert.equal(firstVersion.authorizationRoleAssignmentId, assignment.id)
    assert.equal(firstVersion.authorizationDelegationId, delegation.id)

    const reader = await createCatalogueAccount('Merge History Reader')
    const detail = await authenticatedCatalogueRequest(
      client.get(`/catalogue-categories/${source.id}`),
      reader
    )
    detail.assertStatus(200)
    assert.equal(detail.body().data.mergedInto.id, middle.id)
    assert.equal(detail.body().data.canonicalMergeTarget.id, final.id)
  })

  test('makes merge terminal and reserves only the merged sibling name', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const computers = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Computers'
    )
    const library = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Library Equipment'
    )
    const source = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Notebooks',
      computers.id
    )
    const target = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Laptops',
      computers.id
    )
    const preview = await previewMerge(client, account, source.id, target.id)
    const merged = await mergeRequest(client, account, source.id, target.id, preview.fingerprint)
    merged.assertStatus(200)

    const restore = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${source.id}/restore`)
        .json({ reason: 'Attempt ordinary restoration' }),
      account
    )
    restore.assertStatus(409)

    await source.refresh()
    await assert.rejects(() =>
      source.merge({ archivedAt: null, mergedIntoCategoryId: null }).save()
    )

    const reusedSibling = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: '  NOTEBOOKS  ',
        description: 'Attempt to reuse a terminal merged name.',
        parentId: computers.id,
        reason: 'Attempt merged-name reuse',
      }),
      account
    )
    reusedSibling.assertStatus(409)
    reusedSibling.assertBodyContains({ code: 'E_DUPLICATE' })

    await createCategory(client.post('/catalogue-categories'), account, 'Notebooks', library.id)

    const ordinary = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Legacy Computers',
      computers.id
    )
    await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${ordinary.id}/archive`)
        .json({ reason: 'Ordinary archival' }),
      account
    )
    await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Legacy Computers',
      computers.id
    )
  })

  test('serializes concurrent applications and rolls back a late history failure', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const source = await createCategory(client.post('/catalogue-categories'), account, 'Notebooks')
    const target = await createCategory(client.post('/catalogue-categories'), account, 'Laptops')
    const baseUnit = await createBaseUnit('Concurrent')
    const item = await createCatalogueItem(client, account, source, baseUnit, {
      name: 'Concurrent Laptop',
      keywords: ['concurrent'],
    })
    const preview = await previewMerge(client, account, source.id, target.id)
    const responses = await Promise.all([
      mergeRequest(client, account, source.id, target.id, preview.fingerprint),
      mergeRequest(client, account, source.id, target.id, preview.fingerprint),
    ])

    assert.lengthOf(
      responses.filter((response) => response.status() === 200),
      1
    )
    assert.lengthOf(
      responses.filter((response) => response.status() === 409),
      1
    )

    const rollbackSource = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Portable Devices'
    )
    const rollbackTarget = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Mobile Devices'
    )
    const rollbackItem = await createCatalogueItem(client, account, rollbackSource, baseUnit, {
      name: 'Rollback Tablet',
      keywords: ['tablet'],
    })
    const rollbackPreview = await previewMerge(
      client,
      account,
      rollbackSource.id,
      rollbackTarget.id
    )
    const itemVersionCount = await CatalogueItemVersion.query()
      .where('catalogue_item_id', rollbackItem.id)
      .count('* as total')
      .firstOrFail()

    await CatalogueCategoryVersion.query()
      .where('catalogue_category_id', rollbackSource.id)
      .delete()

    const failed = await mergeRequest(
      client,
      account,
      rollbackSource.id,
      rollbackTarget.id,
      rollbackPreview.fingerprint
    )
    assert.notEqual(failed.status(), 200)

    await Promise.all([rollbackSource.refresh(), rollbackItem.refresh()])
    assert.isNull(rollbackSource.archivedAt)
    assert.isNull(rollbackSource.mergedIntoCategoryId)
    assert.equal(rollbackItem.catalogueCategoryId, rollbackSource.id)
    const afterCount = await CatalogueItemVersion.query()
      .where('catalogue_item_id', rollbackItem.id)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(afterCount.$extras.total), Number(itemVersionCount.$extras.total))

    await item.refresh()
    assert.equal(item.catalogueCategoryId, target.id)
  })

  test('authorizes preview and merge before validation or resource lookup', async ({ client }) => {
    const unauthorized = await createCatalogueAccount('Unauthorized Merge Writer')
    const missingId = randomUUID()
    const preview = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${missingId}/merge-preview`).json({}),
      unauthorized
    )
    const merge = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${missingId}/merge`).json({}),
      unauthorized
    )

    preview.assertStatus(403)
    merge.assertStatus(403)
  })
})
