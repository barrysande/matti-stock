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
import PhysicalLocation from '#models/physical_location'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'

export function cleanupCentralStoreTables() {
  return testUtils.db().truncate()
}

export function authenticatedCentralStoreRequest(request: ApiRequest, account: UserAccount) {
  return request
    .loginAs(account)
    .withSession({ 'auth.credentialVersion': Number(account.credentialVersion) })
}

export async function createCentralStoreAccount(
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
    password: 'Central-store-password-1',
    status,
    credentialVersion: 1,
    passwordResetVersion: 0,
  })
}

export async function createCentralStoreStructure() {
  const institute = await OrganizationalUnit.create({
    name: 'MaTTI Institute',
    unitType: 'INSTITUTE',
    parentId: null,
  })
  const storeUnit = await OrganizationalUnit.create({
    name: 'Central Store',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const siblingUnit = await OrganizationalUnit.create({
    name: 'Engineering',
    unitType: 'DEPARTMENT',
    parentId: institute.id,
  })
  const storeLocation = await PhysicalLocation.create({
    name: 'Central Store',
    parentId: null,
    archivedAt: null,
  })

  return { institute, siblingUnit, storeLocation, storeUnit }
}

export async function createCentralStoreRole(
  permissionKey: 'access.root' | 'intake.record',
  label: string
) {
  await Permission.create({
    key: permissionKey,
    description:
      permissionKey === 'access.root'
        ? 'Administer identity, access, and organizational authority'
        : 'Record opening stock and institutional stock intake',
    customRoleAssignable: permissionKey !== 'access.root',
  })
  const role = await Role.create({
    key:
      permissionKey === 'access.root'
        ? 'MASTER_ADMIN'
        : `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`,
    name: label,
    systemManaged: permissionKey === 'access.root',
  })
  const version = await RoleVersion.create({
    roleId: role.id,
    version: 1,
    reason: `${label} test role`,
    createdByAccountId: null,
  })
  await RoleVersionPermission.create({ roleVersionId: version.id, permissionKey })

  return { role, version }
}

export function grantCentralStoreRole(
  account: UserAccount,
  roleVersion: RoleVersion,
  scopeOrgUnitId: string,
  options: {
    scopeMode?: 'THIS_NODE_ONLY' | 'INCLUDE_DESCENDANTS'
    startsAt?: DateTime
    expiresAt?: DateTime | null
  } = {}
) {
  return RoleAssignment.create({
    accountId: account.id,
    roleVersionId: roleVersion.id,
    scopeOrgUnitId,
    scopeMode: options.scopeMode ?? 'INCLUDE_DESCENDANTS',
    startsAt: options.startsAt ?? DateTime.now().minus({ minutes: 1 }),
    expiresAt: options.expiresAt ?? null,
    grantedByAccountId: null,
    reason: 'Central Store test authority',
  })
}

export async function createCentralStoreRoot(instituteId: string) {
  const { version } = await createCentralStoreRole('access.root', 'Master Admin')
  const account = await createCentralStoreAccount('Central Store Root')
  const assignment = await grantCentralStoreRole(account, version, instituteId)

  return { account, assignment, version }
}

export async function createCentralStoreIntakeActor(
  scopeOrgUnitId: string,
  options: Parameters<typeof grantCentralStoreRole>[3] = {}
) {
  const { role, version } = await createCentralStoreRole('intake.record', 'Store Recorder')
  const account = await createCentralStoreAccount('Central Store Recorder')
  const assignment = await grantCentralStoreRole(account, version, scopeOrgUnitId, options)

  return { account, assignment, role, version }
}

export async function createDelegatedCentralStoreActor(scopeOrgUnitId: string) {
  const direct = await createCentralStoreIntakeActor(scopeOrgUnitId, {
    expiresAt: DateTime.now().plus({ days: 10 }),
  })
  const delegate = await createCentralStoreAccount('Central Store Delegate')
  const delegation = await Delegation.create({
    delegatorAccountId: direct.account.id,
    delegateAccountId: delegate.id,
    startsAt: DateTime.now().minus({ minutes: 1 }),
    expiresAt: DateTime.now().plus({ days: 5 }),
    reason: 'Cover Central Store intake',
  })
  await DelegationAssignment.create({
    delegationId: delegation.id,
    sourceAssignmentId: direct.assignment.id,
  })
  await DelegationResponse.create({
    delegationId: delegation.id,
    kind: 'ACCEPTED',
    respondedByAccountId: delegate.id,
    reason: null,
  })

  return { ...direct, delegate, delegation }
}

export async function configureCentralStore(
  client: { post(path: string): ApiRequest },
  root: UserAccount,
  storeUnitId: string,
  storeLocationId: string
) {
  const response = await authenticatedCentralStoreRequest(
    client.post('/central-store-context').json({
      custodialOrganizationalUnitId: storeUnitId,
      physicalLocationId: storeLocationId,
      reason: 'Configure Central Store for intake',
    }),
    root
  )
  response.assertStatus(201)

  return response
}
