import { DateTime } from 'luxon'
import { test } from '@japa/runner'
import CatalogueCategoryVersion from '#models/catalogue_category_version'
import {
  authenticatedCatalogueRequest,
  cleanupCatalogueTables,
  createCatalogueAccount,
  createCatalogueOrganization,
  createCataloguePermission,
  createCatalogueRole,
  createDelegatedCatalogueActor,
  createDirectCatalogueActor,
  grantCataloguePermission,
} from '#tests/helpers/catalogue'

test.group('Catalogue authority', (group) => {
  group.each.setup(cleanupCatalogueTables)

  test('allows authenticated reads without catalogue-management authority', async ({ client }) => {
    const account = await createCatalogueAccount('Ordinary Catalogue Reader')

    const anonymous = await client.get('/catalogue-categories')
    const authenticated = await authenticatedCatalogueRequest(
      client.get('/catalogue-categories'),
      account
    )

    anonymous.assertStatus(401)
    authenticated.assertStatus(200)
    authenticated.assertBody({ data: [] })
  })

  test('authorizes mutations before payload validation', async ({ client }) => {
    const account = await createCatalogueAccount('Unauthorized Catalogue Writer')

    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({}),
      account
    )

    response.assertStatus(403)
  })

  test('rejects access-root-only catalogue authority', async ({ client }) => {
    await createCataloguePermission('access.root')
    const { version } = await createCatalogueRole('access.root')
    const { institute } = await createCatalogueOrganization()
    const root = await createCatalogueAccount('Access Root Only')
    await grantCataloguePermission(root, version, institute.id)

    const rootResponse = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        reason: 'Attempt with technical root only',
      }),
      root
    )
    rootResponse.assertStatus(403)
  })

  test('rejects department-scoped catalogue authority', async ({ client }) => {
    const departmental = await createDirectCatalogueActor('DEPARTMENT')
    const departmentResponse = await authenticatedCatalogueRequest(
      client.post('/base-units').json({
        name: 'Piece',
        symbol: 'pc',
        kind: 'COUNTABLE',
        reason: 'Attempt with departmental authority',
      }),
      departmental.account
    )
    departmentResponse.assertStatus(403)
  })

  test('accepts direct institution-root authority and records its exact assignment', async ({
    client,
    assert,
  }) => {
    const { account, assignment, institute } = await createDirectCatalogueActor()

    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: 'Furniture',
        description: 'Furniture and fittings used by the institute.',
        reason: 'Create the furniture classification',
      }),
      account
    )

    response.assertStatus(201)
    const version = await CatalogueCategoryVersion.firstOrFail()
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.isNull(version.authorizationDelegationId)
    assert.equal(version.permissionKey, 'catalogue.manage')
    assert.equal(version.resolvedScopeOrganizationalUnitId, institute.id)
  })

  test('accepts an effective whole-role delegation and records the delegation', async ({
    client,
    assert,
  }) => {
    const { assignment, delegate, delegation } = await createDelegatedCatalogueActor()

    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: 'ICT Equipment',
        description: 'Computing and communication equipment.',
        reason: 'Create classification while covering the role holder',
      }),
      delegate
    )

    response.assertStatus(201)
    const version = await CatalogueCategoryVersion.firstOrFail()
    assert.equal(version.authorizationRoleAssignmentId, assignment.id)
    assert.equal(version.authorizationDelegationId, delegation.id)
  })

  test('rejects expired catalogue authority', async ({ client }) => {
    const fixture = await createDirectCatalogueActor()
    await fixture.assignment.merge({ expiresAt: DateTime.now().minus({ seconds: 1 }) }).save()

    const response = await authenticatedCatalogueRequest(
      client.post('/catalogue-categories').json({
        name: 'Expired Category',
        description: 'Must not be created.',
        reason: 'Attempt with expired authority',
      }),
      fixture.account
    )

    response.assertStatus(403)
  })
})
