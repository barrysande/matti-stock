import InvalidRoleChangeException from '#exceptions/invalid_role_change_exception'
import Permission from '#models/permission'
import type Role from '#models/role'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class RoleVersionService {
  private invalid(message: string): never {
    throw new InvalidRoleChangeException(message)
  }

  private normalizedKeys(permissionKeys: string[]) {
    const keys = [...new Set(permissionKeys)].sort()
    if (keys.length !== permissionKeys.length) {
      this.invalid('A role permission may be selected only once.')
    }
    return keys
  }

  private async assertAssignable(keys: string[], trx: TransactionClientContract) {
    const permissions = await Permission.query({ client: trx }).whereIn('key', keys)
    const found = new Set(permissions.map(({ key }) => key))
    const missing = keys.filter((key) => !found.has(key))
    if (missing.length > 0) {
      this.invalid(`Unknown role permission: ${missing.join(', ')}.`)
    }

    const restricted = permissions
      .filter(({ customRoleAssignable }) => !customRoleAssignable)
      .map(({ key }) => key)
      .sort()
    if (restricted.length > 0) {
      this.invalid(`These permissions are reserved for system roles: ${restricted.join(', ')}.`)
    }
  }

  private createMemberships(
    version: RoleVersion,
    permissionKeys: string[],
    trx: TransactionClientContract
  ) {
    return RoleVersionPermission.createMany(
      permissionKeys.map((permissionKey) => ({
        roleVersionId: version.id,
        permissionKey,
      })),
      { client: trx }
    )
  }

  /** Creates the immutable first permission version for a configurable role. */
  async createInitial(
    role: Role,
    permissionKeys: string[],
    reason: string,
    actorAccountId: string,
    trx: TransactionClientContract
  ) {
    const keys = this.normalizedKeys(permissionKeys)
    await this.assertAssignable(keys, trx)
    const version = await RoleVersion.create(
      {
        roleId: role.id,
        version: 1,
        reason,
        createdByAccountId: actorAccountId,
      },
      { client: trx }
    )
    await this.createMemberships(version, keys, trx)
    return { version, permissionKeys: keys }
  }

  /** Appends a new immutable permission version while leaving prior assignments untouched. */
  async append(
    role: Role,
    permissionKeys: string[],
    reason: string,
    actorAccountId: string,
    trx: TransactionClientContract
  ) {
    const keys = this.normalizedKeys(permissionKeys)
    await this.assertAssignable(keys, trx)
    const current = await RoleVersion.query({ client: trx })
      .where('role_id', role.id)
      .orderBy('version', 'desc')
      .forUpdate()
      .firstOrFail()
    const memberships = await RoleVersionPermission.query({ client: trx })
      .where('role_version_id', current.id)
      .orderBy('permission_key', 'asc')
    const currentKeys = memberships.map(({ permissionKey }) => permissionKey)

    if (
      currentKeys.length === keys.length &&
      currentKeys.every((permissionKey, index) => permissionKey === keys[index])
    ) {
      this.invalid('The role already has this permission set.')
    }

    const version = await RoleVersion.create(
      {
        roleId: role.id,
        version: Number(current.version) + 1,
        reason,
        createdByAccountId: actorAccountId,
      },
      { client: trx }
    )
    await this.createMemberships(version, keys, trx)
    return { version, previousVersion: current, permissionKeys: keys, previousKeys: currentKeys }
  }
}
