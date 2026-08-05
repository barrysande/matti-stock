import type { ApiRequest } from '@japa/api-client'
import { test } from '@japa/runner'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import type UserAccount from '#models/user_account'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
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
      description: `${name} classification description.`,
      parentId,
      reason: `Create ${name}`,
    }),
    account
  )
  response.assertStatus(201)
  return CatalogueCategory.findByOrFail('name', name)
}

test.group('Catalogue categories administration', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('creates at most three levels with complete initial history', async ({ client, assert }) => {
    const { account, assignment } = await createDirectCatalogueActor()
    const root = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'ICT Equipment'
    )
    const child = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Computers',
      root.id
    )
    const leaf = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Laptops',
      child.id
    )

    const fourth = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: 'Ultrabooks',
        description: 'A prohibited fourth category level.',
        parentId: leaf.id,
        reason: 'Attempt a fourth level',
      }),
      account
    )
    fourth.assertStatus(409)
    fourth.assertBodyContains({ code: 'E_INVALID_CATALOGUE_CATEGORY_CHANGE' })

    const version = await CatalogueCategoryVersion.findByOrFail('catalogueCategoryId', leaf.id)
    assert.equal(version.changeKind, 'CREATED')
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.equal(version.name, 'Laptops')
    assert.equal(version.description, 'Laptops classification description.')
  })

  test('enforces active sibling uniqueness while allowing the same name in another branch', async ({
    client,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const ict = await createCategory(client.post('/catalogue-categories'), account, 'ICT Equipment')
    const workshop = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Workshop Equipment'
    )
    await createCategory(client.post('/catalogue-categories'), account, 'Tools', ict.id)

    const duplicate = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: '  tools  ',
        description: 'A duplicate sibling.',
        parentId: ict.id,
        reason: 'Attempt duplicate sibling',
      }),
      account
    )
    duplicate.assertStatus(409)
    duplicate.assertBodyContains({ code: 'E_DUPLICATE' })

    await createCategory(client.post('/catalogue-categories'), account, 'Tools', workshop.id)
  })

  test('updates details and prevents circular or over-depth moves', async ({ client }) => {
    const { account } = await createDirectCatalogueActor()
    const furniture = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Furniture'
    )
    const chairs = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Chairs',
      furniture.id
    )
    const executive = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Executive Chairs',
      chairs.id
    )
    const tools = await createCategory(client.post('/catalogue-categories'), account, 'Tools')

    const update = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${chairs.id}/details`).json({
        name: 'Seating',
        description: 'Chairs and other institutional seating.',
        reason: 'Use a broader approved description',
      }),
      account
    )
    update.assertStatus(200)

    const circular = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${furniture.id}/reparent`).json({
        parentId: executive.id,
        reason: 'Attempt a circular move',
      }),
      account
    )
    circular.assertStatus(409)

    const tooDeep = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${tools.id}/reparent`).json({
        parentId: executive.id,
        reason: 'Attempt an over-depth move',
      }),
      account
    )
    tooDeep.assertStatus(409)
  })

  test('requires active children to be cleared and parents to be restored in order', async ({
    client,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const parent = await createCategory(client.post('/catalogue-categories'), account, 'Furniture')
    const child = await createCategory(
      client.post('/catalogue-categories'),
      account,
      'Chairs',
      parent.id
    )

    const blockedParent = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${parent.id}/archive`).json({
        reason: 'Attempt to archive before child',
      }),
      account
    )
    blockedParent.assertStatus(409)

    const archivedChild = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${child.id}/archive`).json({ reason: 'Retire chairs' }),
      account
    )
    archivedChild.assertStatus(200)
    const archivedParent = await authenticatedCatalogueRequest(
      client
        .post(`/catalogue-categories/${parent.id}/archive`)
        .json({ reason: 'Retire furniture' }),
      account
    )
    archivedParent.assertStatus(200)

    const blockedChild = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${child.id}/restore`).json({
        reason: 'Attempt child first',
      }),
      account
    )
    blockedChild.assertStatus(409)

    const restoredParent = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${parent.id}/restore`).json({
        reason: 'Restore furniture',
      }),
      account
    )
    restoredParent.assertStatus(200)
    const restoredChild = await authenticatedCatalogueRequest(
      client.post(`/catalogue-categories/${child.id}/restore`).json({ reason: 'Restore chairs' }),
      account
    )
    restoredChild.assertStatus(200)
  })

  test('serializes concurrent active sibling duplicates', async ({ client, assert }) => {
    const { account } = await createDirectCatalogueActor()
    const responses = await Promise.all(
      ['First request', 'Second request'].map((reason) =>
        authenticatedCatalogueRequest(
          client.post('/catalogue-categories').json({
            name: 'Furniture',
            description: 'Furniture and fittings.',
            reason,
          }),
          account
        )
      )
    )

    const created = responses.find(
      (response) => response.body().message === 'Catalogue category created.'
    )
    const duplicate = responses.find((response) => response.body().code === 'E_DUPLICATE')
    created?.assertStatus(201)
    duplicate?.assertStatus(409)
    assert.exists(created)
    assert.exists(duplicate)
    const count = await CatalogueCategory.query()
      .where('name', 'Furniture')
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(count.$extras.total), 1)
  })
})
