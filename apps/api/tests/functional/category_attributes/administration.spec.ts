import type { ApiRequest } from '@japa/api-client'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CatalogueCategory from '#models/catalogue_category'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import CategoryAttributeChoiceVersion from '#models/category_attribute_choice_version'
import CategoryAttributeVersion from '#models/category_attribute_version'
import type UserAccount from '#models/user_account'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
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

async function createAttribute(
  request: ApiRequest,
  account: UserAccount,
  categoryId: string,
  overrides: Record<string, unknown> = {}
) {
  const response = await authenticatedCatalogueRequest(
    request.json({
      catalogueCategoryId: categoryId,
      name: 'RAM',
      description: 'Enter installed memory.',
      dataType: 'TEXT',
      isRequired: false,
      scope: 'CATALOGUE',
      reason: 'Create controlled attribute',
      ...overrides,
    }),
    account
  )
  response.assertStatus(201)
  return CategoryAttribute.findByOrFail('name', String(overrides.name ?? 'RAM'))
}

test.group('Category attributes administration', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('creates every supported type and both scopes with authorization-attributed history', async ({
    client,
    assert,
  }) => {
    const { account, assignment } = await createDirectCatalogueActor()
    const category = await createCategory('Computers')
    const definitions = [
      ['Model', 'TEXT', 'CATALOGUE'],
      ['Weight', 'NUMBER', 'CATALOGUE'],
      ['Warranty date', 'DATE', 'CATALOGUE'],
      ['Encrypted', 'YES_NO', 'INVENTORY_UNIT'],
      ['Condition grade', 'PREDEFINED_CHOICE', 'INVENTORY_UNIT'],
    ] as const

    for (const [name, dataType, scope] of definitions) {
      await createAttribute(client.post('/category-attributes'), account, category.id, {
        name,
        description: null,
        dataType,
        isRequired: name === 'Model',
        scope,
        choices: dataType === 'PREDEFINED_CHOICE' ? [{ label: 'A' }, { label: 'B' }] : undefined,
      })
    }

    const attributes = await CategoryAttribute.query().orderBy('name', 'asc')
    assert.lengthOf(attributes, 5)
    assert.isTrue(attributes.every((attribute) => attribute.catalogueCategoryId === category.id))
    assert.isTrue(attributes.every((attribute) => attribute.description === null))

    const versions = await CategoryAttributeVersion.all()
    assert.lengthOf(versions, 5)
    assert.isTrue(
      versions.every(
        (version) =>
          version.changeKind === 'CREATED' &&
          version.authorizationRoleAssignmentId === assignment.id &&
          version.permissionKey === 'catalogue.manage'
      )
    )
    assert.lengthOf(await CategoryAttributeChoice.all(), 2)
    assert.lengthOf(await CategoryAttributeChoiceVersion.all(), 2)
  })

  test('requires valid predefined choices and rolls back an atomic duplicate-choice creation', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const category = await createCategory('Vehicles')

    const missing = await authenticatedCatalogueRequest(
      client.post('/category-attributes').json({
        catalogueCategoryId: category.id,
        name: 'Fuel grade',
        dataType: 'PREDEFINED_CHOICE',
        isRequired: true,
        scope: 'CATALOGUE',
        reason: 'Attempt without choices',
      }),
      account
    )
    missing.assertStatus(409)
    missing.assertBodyContains({ code: 'E_INVALID_CATEGORY_ATTRIBUTE_CHANGE' })

    const invalid = await authenticatedCatalogueRequest(
      client.post('/category-attributes').json({
        catalogueCategoryId: category.id,
        name: 'Engine number',
        dataType: 'TEXT',
        isRequired: false,
        scope: 'INVENTORY_UNIT',
        choices: [{ label: 'Diesel' }],
        reason: 'Attempt choices on text',
      }),
      account
    )
    invalid.assertStatus(409)

    const duplicate = await authenticatedCatalogueRequest(
      client.post('/category-attributes').json({
        catalogueCategoryId: category.id,
        name: 'Fuel grade',
        dataType: 'PREDEFINED_CHOICE',
        isRequired: true,
        scope: 'CATALOGUE',
        choices: [{ label: ' Diesel ' }, { label: 'diesel' }],
        reason: 'Attempt duplicate choices',
      }),
      account
    )
    duplicate.assertStatus(409)
    duplicate.assertBodyContains({ code: 'E_INVALID_CATEGORY_ATTRIBUTE_CHOICE_CHANGE' })
    assert.equal(
      await CategoryAttribute.query()
        .where('name', 'Fuel grade')
        .count('* as total')
        .then((row) => Number(row[0].$extras.total)),
      0
    )
  })

  test('allows semantic edits before use and locks semantic fields after an affected target exists', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const computers = await createCategory('Computers')
    const furniture = await createCategory('Furniture')
    const attribute = await createAttribute(
      client.post('/category-attributes'),
      account,
      computers.id
    )

    const semantics = await authenticatedCatalogueRequest(
      client.post(`/category-attributes/${attribute.id}/semantics`).json({
        catalogueCategoryId: furniture.id,
        dataType: 'NUMBER',
        isRequired: true,
        scope: 'INVENTORY_UNIT',
        reason: 'Correct semantics before use',
      }),
      account
    )
    semantics.assertStatus(200)
    await attribute.refresh()
    assert.equal(attribute.catalogueCategoryId, furniture.id)
    assert.equal(attribute.dataType, 'NUMBER')

    await attribute.merge({ semanticsLockedAt: DateTime.now() }).save()
    const blocked = await authenticatedCatalogueRequest(
      client.post(`/category-attributes/${attribute.id}/semantics`).json({
        catalogueCategoryId: furniture.id,
        dataType: 'DATE',
        isRequired: true,
        scope: 'INVENTORY_UNIT',
        reason: 'Attempt a semantic change after use',
      }),
      account
    )
    blocked.assertStatus(409)
    blocked.assertBodyContains({ code: 'E_INVALID_CATEGORY_ATTRIBUTE_CHANGE' })

    const details = await authenticatedCatalogueRequest(
      client.post(`/category-attributes/${attribute.id}/details`).json({
        name: 'Manufacture year',
        description: 'Enter the year shown by the manufacturer.',
        reason: 'Clarify the label and guidance',
      }),
      account
    )
    details.assertStatus(200)
    assert.equal(
      await CategoryAttributeVersion.query()
        .where('category_attribute_id', attribute.id)
        .count('* as total')
        .then((row) => Number(row[0].$extras.total)),
      3
    )
  })

  test('adds, reorders, archives, and restores unused choices while protecting used choices', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const category = await createCategory('Vehicles')
    const attribute = await createAttribute(
      client.post('/category-attributes'),
      account,
      category.id,
      {
        name: 'Fuel grade',
        dataType: 'PREDEFINED_CHOICE',
        choices: [{ label: 'Petrol' }, { label: 'Diesel' }],
      }
    )

    const add = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices`)
        .json({ label: 'Electric', reason: 'Add supported fuel type' }),
      account
    )
    add.assertStatus(201)
    const choices = await CategoryAttributeChoice.query()
      .where('category_attribute_id', attribute.id)
      .orderBy('display_order', 'asc')
    const electric = choices.find((choice) => choice.label === 'Electric')!

    const reorder = await authenticatedCatalogueRequest(
      client.post(`/category-attributes/${attribute.id}/choices/reorder`).json({
        choiceIds: [electric.id, choices[0].id, choices[1].id],
        reason: 'Present electric first',
      }),
      account
    )
    reorder.assertStatus(200)

    const archive = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices/${electric.id}/archive`)
        .json({ reason: 'Remove unused entry option' }),
      account
    )
    archive.assertStatus(200)
    const restore = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices/${electric.id}/restore`)
        .json({ reason: 'Reinstate entry option' }),
      account
    )
    restore.assertStatus(200)

    const petrol = choices.find((choice) => choice.label === 'Petrol')!
    await petrol.merge({ firstUsedAt: DateTime.now() }).save()
    const renameUsed = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices/${petrol.id}/details`)
        .json({ label: 'Unleaded', reason: 'Attempt to repurpose a used choice' }),
      account
    )
    renameUsed.assertStatus(409)
    const archiveUsed = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices/${petrol.id}/archive`)
        .json({ reason: 'Attempt to remove a used choice' }),
      account
    )
    archiveUsed.assertStatus(409)
    const unchangedPetrol = await CategoryAttributeChoice.findOrFail(petrol.id)
    assert.equal(unchangedPetrol.label, 'Petrol')
  })

  test('requires institution-root catalogue authority before validation or resource lookup', async ({
    client,
  }) => {
    const category = await createCategory('Furniture')
    const reader = await createCatalogueAccount('Attribute Reader')
    const forbidden = await authenticatedCatalogueRequest(
      client.post('/category-attributes').json({ catalogueCategoryId: category.id }),
      reader
    )
    forbidden.assertStatus(403)

    const missing = await authenticatedCatalogueRequest(
      client.post('/category-attributes/00000000-0000-4000-8000-000000000000/details').json({}),
      reader
    )
    missing.assertStatus(403)
  })

  test('serializes concurrent active-name duplicates within one exact category', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const category = await createCategory('Computers')
    const responses = await Promise.all(
      ['First request', 'Second request'].map((reason) =>
        authenticatedCatalogueRequest(
          client.post('/category-attributes').json({
            catalogueCategoryId: category.id,
            name: 'Storage',
            dataType: 'TEXT',
            isRequired: false,
            scope: 'CATALOGUE',
            reason,
          }),
          account
        )
      )
    )

    assert.exists(responses.find((response) => response.status() === 201))
    assert.exists(responses.find((response) => response.body().code === 'E_DUPLICATE'))
    assert.equal(
      await CategoryAttribute.query()
        .where('catalogue_category_id', category.id)
        .where('name', 'Storage')
        .count('* as total')
        .then((row) => Number(row[0].$extras.total)),
      1
    )
  })

  test('serializes concurrent semantic edits against the locked current projection', async ({
    client,
    assert,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const category = await createCategory('Furniture')
    const attribute = await createAttribute(
      client.post('/category-attributes'),
      account,
      category.id,
      { name: 'Dimensions' }
    )
    const payload = {
      catalogueCategoryId: category.id,
      dataType: 'NUMBER',
      isRequired: false,
      scope: 'CATALOGUE',
      reason: 'Use numeric dimensions',
    } as const

    const responses = await Promise.all(
      [1, 2].map(() =>
        authenticatedCatalogueRequest(
          client.post(`/category-attributes/${attribute.id}/semantics`).json(payload),
          account
        )
      )
    )
    assert.exists(responses.find((response) => response.status() === 200))
    assert.exists(
      responses.find((response) => response.body().code === 'E_INVALID_CATEGORY_ATTRIBUTE_CHANGE')
    )
    assert.equal(
      await CategoryAttributeVersion.query()
        .where('category_attribute_id', attribute.id)
        .count('* as total')
        .then((row) => Number(row[0].$extras.total)),
      2
    )
  })

  test('protects the last active choice and exposes no destructive delete route', async ({
    client,
  }) => {
    const { account } = await createDirectCatalogueActor()
    const category = await createCategory('Vehicles')
    const attribute = await createAttribute(
      client.post('/category-attributes'),
      account,
      category.id,
      {
        name: 'Transmission',
        dataType: 'PREDEFINED_CHOICE',
        choices: [{ label: 'Automatic' }],
      }
    )
    const choice = await CategoryAttributeChoice.findByOrFail('categoryAttributeId', attribute.id)

    const archive = await authenticatedCatalogueRequest(
      client
        .post(`/category-attributes/${attribute.id}/choices/${choice.id}/archive`)
        .json({ reason: 'Attempt to remove the only option' }),
      account
    )
    archive.assertStatus(409)

    const deletion = await authenticatedCatalogueRequest(
      client.delete(`/category-attributes/${attribute.id}`),
      account
    )
    deletion.assertStatus(404)
  })
})
