import type { ApiRequest } from '@japa/api-client'
import { test } from '@japa/runner'
import CatalogueCategory from '#models/catalogue_category'
import type UserAccount from '#models/user_account'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

async function createCategory(
  request: ApiRequest,
  account: UserAccount,
  name: string,
  parentId?: string
) {
  const response = await authenticatedCatalogueRequest(
    request.json({
      name,
      description: `${name} category.`,
      parentId,
      reason: `Create ${name}`,
    }),
    account
  )
  response.assertStatus(201)
  return CatalogueCategory.findByOrFail('name', name)
}

test.group('Catalogue categories directory', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('returns path-ordered active categories to an ordinary authenticated reader', async ({
    client,
    assert,
  }) => {
    const { account: manager } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Catalogue Directory Reader')
    const ict = await createCategory(client.post('/catalogue-categories'), manager, 'ICT Equipment')
    const computers = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Computers',
      ict.id
    )
    await createCategory(client.post('/catalogue-categories'), manager, 'Laptops', computers.id)
    const former = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Former Equipment'
    )
    await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${former.id}/archive`).json({ reason: 'Retire category' }),
      manager
    )

    const response = await authenticatedCatalogueRequest(
      client.get('/catalogue-categories'),
      reader
    )
    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((category: { path: string; depth: number }) => ({
        path: category.path,
        depth: category.depth,
      })),
      [
        { path: 'ICT Equipment', depth: 1 },
        { path: 'ICT Equipment / Computers', depth: 2 },
        { path: 'ICT Equipment / Computers / Laptops', depth: 3 },
      ]
    )
  })

  test('shows archived definitions only when requested and searches names or descriptions', async ({
    client,
    assert,
  }) => {
    const { account: manager } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Archived Category Reader')
    const category = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Legacy ICT'
    )
    await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${category.id}/archive`).json({
        reason: 'Retire legacy category',
      }),
      manager
    )

    const defaultDirectory = await authenticatedCatalogueRequest(
      client.get('/catalogue-categories'),
      reader
    )
    defaultDirectory.assertBody({ data: [] })

    const archived = await authenticatedCatalogueRequest(
      client.get('/catalogue-categories').qs({ includeArchived: true, search: 'legacy' }),
      reader
    )
    archived.assertStatus(200)
    assert.equal(archived.body().data[0].name, 'Legacy ICT')
    assert.isNotNull(archived.body().data[0].archivedAt)
  })

  test('reviews similar names with selected-parent and full-path context', async ({
    client,
    assert,
  }) => {
    const { account: manager } = await createDirectCatalogueActor()
    const furniture = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Furniture'
    )
    const workshop = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Workshop Equipment'
    )
    await createCategory(client.post('/catalogue-categories'), manager, 'Chairs', furniture.id)
    await createCategory(client.post('/catalogue-categories'), manager, 'Chairs', workshop.id)
    const archived = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Chairs Upholstered'
    )
    await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${archived.id}/archive`)
        .json({ reason: 'Retire the former category' }),
      manager
    )

    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories/creation-review').json({
        name: 'Chairs',
        parentId: workshop.id,
      }),
      manager
    )

    response.assertStatus(200)
    const candidates = response.body().data as Array<{
      path: string
      matchKind: string
      archivedAt: string | null
    }>
    assert.equal(candidates[0].path, 'Workshop Equipment / Chairs')
    assert.equal(candidates[0].matchKind, 'EXACT_NAME')
    assert.deepEqual(
      candidates.map(({ path }) => path),
      ['Workshop Equipment / Chairs', 'Furniture / Chairs', 'Chairs Upholstered']
    )
    assert.isNotNull(candidates[2].archivedAt)
  })

  test('returns complete effective history with safe authorization context', async ({
    client,
    assert,
  }) => {
    const { account: manager, assignment, institute } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Category History Reader')
    const category = await createCategory(
      client.post('/catalogue-categories'),
      manager,
      'Office Equipment'
    )
    await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${category.id}/details`).json({
        name: 'Office Machines',
        description: 'Machines and equipment used for office work.',
        reason: 'Use the approved category description',
      }),
      manager
    )

    const detail = await authenticatedCatalogueRequest(
      client.get(`/catalogue-categories/${category.id}`),
      reader
    )
    detail.assertStatus(200)
    assert.notProperty(detail.body().data, 'versions')

    const response = await authenticatedCatalogueRequest(
      client.get(`/catalogue-categories/${category.id}/history`),
      reader
    )
    response.assertStatus(200)
    assert.deepEqual(
      response.body().data.map((version: { version: number; changeKind: string }) => ({
        version: version.version,
        changeKind: version.changeKind,
      })),
      [
        { version: 2, changeKind: 'DETAILS_UPDATED' },
        { version: 1, changeKind: 'CREATED' },
      ]
    )
    assert.equal(response.body().data[0].authorization.roleAssignmentId, assignment.id)
    assert.equal(
      response.body().data[0].authorization.resolvedScope.organizationalUnitId,
      institute.id
    )
    assert.equal(response.body().metadata.currentPage, 1)
  })
})
