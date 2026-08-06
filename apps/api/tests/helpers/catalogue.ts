import { randomUUID } from 'node:crypto'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiRequest } from '@japa/api-client'
import { DateTime } from 'luxon'
import Delegation from '#models/delegation'
import DelegationAssignment from '#models/delegation_assignment'
import DelegationResponse from '#models/delegation_response'
import OrganizationalUnit from '#models/organizational_unit'
import Permission from '#models/permission'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import BaseUnit from '#models/base_unit'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import { catalogueItemNameKey } from '#utils/catalogue_item'

export function cleanupCatalogueTables() {
  return testUtils.db().truncate()
}

export function authenticatedCatalogueRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

export async function createCatalogueAccount(
  label: string,
  status: 'ACTIVE' | 'SUSPENDED' = 'ACTIVE'
) {
  const token = randomUUID().slice(0, 8)
  const slug = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '.')
  const person = await Person.create({
    displayName: label,
    staffNumber: null,
    primaryEmail: `${slug}.${token}@example.com`,
    primaryEmailVerifiedAt: DateTime.now(),
  })
  return UserAccount.create({
    personId: person.id,
    email: person.primaryEmail!,
    password: 'Catalogue-password-1',
    status,
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

export async function createCataloguePermission(key = 'catalogue.manage') {
  return Permission.create({
    key,
    description:
      key === 'catalogue.manage'
        ? 'Create and administer stock catalogue definitions'
        : 'Administer identity, access, and organizational authority',
    customRoleAssignable: key !== 'access.root',
  })
}

export async function createCatalogueRole(permissionKey: string) {
  const key = `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`
  const role = await Role.create({
    key,
    name: `${permissionKey} test role`,
    systemManaged: false,
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: 'Catalogue test role',
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({ roleVersionId: version.id, permissionKey })
  return { role, version }
}

export async function createCatalogueOrganization() {
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const department = await OrganizationalUnit.create({
    name: 'Engineering',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  return { institute, department }
}

export async function grantCataloguePermission(
  account: UserAccount,
  roleVersion: RoleVersion,
  scopeOrganizationalUnitId: string,
  expiresAt: DateTime | null = null
) {
  return RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId: scopeOrganizationalUnitId,
    scopeMode: 'INCLUDE_DESCENDANTS',
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt,
    grantedByAccountId: null,
    reason: 'Catalogue test authority',
  })
}

export async function createDirectCatalogueActor(scope: 'INSTITUTE' | 'DEPARTMENT' = 'INSTITUTE') {
  await createCataloguePermission()
  const { version } = await createCatalogueRole('catalogue.manage')
  const organization = await createCatalogueOrganization()
  const account = await createCatalogueAccount(`Catalogue ${scope} Actor`)
  const assignment = await grantCataloguePermission(
    account,
    version,
    scope === 'INSTITUTE' ? organization.institute.id : organization.department.id
  )
  return { account, assignment, ...organization, version }
}

export async function createDelegatedCatalogueActor() {
  await createCataloguePermission()
  const { version } = await createCatalogueRole('catalogue.manage')
  const organization = await createCatalogueOrganization()
  const holder = await createCatalogueAccount('Catalogue Holder')
  const delegate = await createCatalogueAccount('Catalogue Delegate')
  const assignment = await grantCataloguePermission(
    holder,
    version,
    organization.institute.id,
    DateTime.now().plus({ days: 10 })
  )
  const delegation = await Delegation.create({
    delegatorAccountId: holder.id,
    delegateAccountId: delegate.id,
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: DateTime.now().plus({ days: 5 }),
    reason: 'Cover catalogue administration',
  })
  await DelegationAssignment.create({
    delegationId: delegation.id,
    sourceAssignmentId: assignment.id,
  })
  await DelegationResponse.create({
    delegationId: delegation.id,
    kind: 'ACCEPTED',
    respondedByAccountId: delegate.id,
    reason: null,
  })
  return { assignment, delegate, delegation, holder, ...organization }
}

export async function createCatalogueClassification(label: string) {
  const category = await CatalogueCategory.create({
    name: `${label} category`,
    description: `${label} catalogue classification.`,
    parentId: null,
    archivedAt: null,
  })
  const baseUnit = await BaseUnit.create({
    name: `${label} piece`,
    symbol: `${label.slice(0, 4).toLowerCase()}-pc`,
    kind: 'COUNTABLE',
    precision: 0,
    firstUsedAt: null,
    archivedAt: null,
  })
  return { category, baseUnit }
}

export async function createCatalogueItem(
  client: { post(path: string): ApiRequest },
  account: UserAccount,
  category: CatalogueCategory,
  baseUnit: BaseUnit,
  overrides: Record<string, unknown> = {}
) {
  const proposal = {
    name: 'Wooden Chair — Armless',
    keywords: ['wooden chair', 'armless'],
    catalogueCategoryId: category.id,
    stockType: 'FIXED_NON_CONSUMABLE',
    ...overrides,
  }
  const review = await authenticatedCatalogueRequest(
    client.post('/catalogue-items/creation-review').json(proposal),
    account
  )
  review.assertStatus(200)
  const reviewBody = review.body().data as { fingerprint: string; candidates: unknown[] }
  const response = await authenticatedCatalogueRequest(
    client.post('/catalogue-items').json({
      ...proposal,
      description: 'A shared catalogue definition for interchangeable wooden chairs.',
      trackingMethod: 'QUANTITY',
      trackingMethodConfirmed: true,
      baseUnitId: baseUnit.id,
      identificationStatus: 'CONFIRMED',
      attributeValues: [],
      reviewFingerprint: reviewBody.fingerprint,
      confirmedNotInterchangeable: reviewBody.candidates.length ? true : undefined,
      similarityReason: reviewBody.candidates.length
        ? 'The reviewed item has a materially different specification.'
        : undefined,
      reason: 'Create catalogue definition',
      ...overrides,
    }),
    account
  )
  response.assertStatus(201)
  return CatalogueItem.findByOrFail('normalizedName', catalogueItemNameKey(String(proposal.name)))
}
