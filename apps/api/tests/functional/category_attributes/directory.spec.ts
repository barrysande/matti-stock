import { test } from '@japa/runner'
import CatalogueCategory from '#models/catalogue_category'
import CategoryAttribute from '#models/category_attribute'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createDelegatedCatalogueActor,
  createDirectCatalogueActor,
} from '#tests/helpers/catalogue'

async function createCategory(name: string, parentId: string | null = null) {
  return CatalogueCategory.create({
    name,
    description: `${name} classification.`,
    parentId,
    archivedAt: null,
  })
}

test.group('Category attributes directory', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('filters by exact category without child inheritance and returns active choices in order', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const reader = await createCatalogueAccount('Attribute Reader')
    const computers = await createCategory('Computers')
    const laptops = await createCategory('Laptops', computers.id)

    for (const [category, name, choices] of [
      [computers, 'RAM', undefined],
      [laptops, 'Storage type', [{ label: 'SSD' }, { label: 'HDD' }]],
    ] as const) {
      const response = await authenticatedCatalogueRequest(
        client.post('/category-attributes').json({
          catalogueCategoryId: category.id,
          name,
          description: `Enter ${name}.`,
          dataType: choices ? 'PREDEFINED_CHOICE' : 'TEXT',
          isRequired: false,
          scope: 'CATALOGUE',
          choices,
          reason: `Create ${name}`,
        }),
        account
      )
      response.assertStatus(201)
    }

    const childOnly = await authenticatedCatalogueRequest(
      client.get('/category-attributes').qs({ categoryId: laptops.id }),
      reader
    )
    childOnly.assertStatus(200)
    assert.deepEqual(
      childOnly.body().data.map((attribute: { name: string }) => attribute.name),
      ['Storage type']
    )
    assert.deepEqual(
      childOnly.body().data[0].choices.map((choice: { label: string }) => choice.label),
      ['SSD', 'HDD']
    )
  })

  test('supports archived visibility and exposes safe effective definition and choice history', async ({
    client,
    assert,
  }) => {
    const { delegate, delegation, assignment } = await createDelegatedCatalogueActor()
    const reader = await createCatalogueAccount('History Reader')
    const vehicles = await createCategory('Vehicles')
    const created = await authenticatedCatalogueRequest(
      client.post('/category-attributes').json({
        catalogueCategoryId: vehicles.id,
        name: 'Fuel grade',
        description: 'Choose the approved fuel grade.',
        dataType: 'PREDEFINED_CHOICE',
        isRequired: true,
        scope: 'CATALOGUE',
        choices: [{ label: 'Petrol' }, { label: 'Diesel' }],
        reason: 'Create fuel-grade control',
      }),
      delegate
    )
    created.assertStatus(201)
    const attribute = await CategoryAttribute.findByOrFail('name', 'Fuel grade')

    const archived = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/archive`)
        .json({ reason: 'Retire this definition' }),
      delegate
    )
    archived.assertStatus(200)

    const active = await authenticatedCatalogueRequest(client.get('/category-attributes'), reader)
    active.assertStatus(200)
    assert.lengthOf(active.body().data, 0)

    const includingArchived = await authenticatedCatalogueRequest(
      client.get('/category-attributes').qs({ includeArchived: true, search: 'fuel' }),
      reader
    )
    includingArchived.assertStatus(200)
    assert.equal(includingArchived.body().data[0].name, 'Fuel grade')

    const detail = await authenticatedCatalogueRequest(
      client.get(`/category-attributes/${attribute.id}`),
      reader
    )
    detail.assertStatus(200)
    assert.deepEqual(
      detail.body().data.versions.map((version: { changeKind: string }) => version.changeKind),
      ['ARCHIVED', 'CREATED']
    )
    assert.equal(detail.body().data.versions[0].authorization.roleAssignmentId, assignment.id)
    assert.equal(detail.body().data.versions[0].authorization.delegationId, delegation.id)
    assert.deepEqual(
      detail.body().data.choices.map((choice: { label: string }) => choice.label),
      ['Petrol', 'Diesel']
    )
    assert.equal(detail.body().data.choices[0].versions[0].changeKind, 'CREATED')
    assert.notProperty(detail.body().data.versions[0], 'authorizationRoleAssignment')
    assert.notProperty(detail.body().data.choices[0].versions[0], 'authorizationDelegation')
  })

  test('allows the same active attribute name in different exact categories', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const computers = await createCategory('Computers')
    const furniture = await createCategory('Furniture')

    for (const category of [computers, furniture]) {
      const response = await authenticatedCatalogueRequest(
        client.post('/category-attributes').json({
          catalogueCategoryId: category.id,
          name: 'Material',
          dataType: 'TEXT',
          isRequired: false,
          scope: 'CATALOGUE',
          reason: `Create material for ${category.name}`,
        }),
        account
      )
      response.assertStatus(201)
    }

    assert.lengthOf(await CategoryAttribute.query().where('name', 'Material'), 2)
  })
})
