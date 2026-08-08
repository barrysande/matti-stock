import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import Permission from '#models/permission'
import Role from '#models/role'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const PERMISSIONS = [
  ['access.root', 'Administer identity, access, and organizational authority', false],
  ['adjustment.approve', 'Approve or reject a proposed reconciliation adjustment', true],
  ['adjustment.propose', 'Propose a reconciliation adjustment', true],
  ['catalogue.manage', 'Create and administer stock catalogue definitions', true],
  ['condition.report', 'Record an observed stock condition or missing-stock report', true],
  ['condition.review', 'Review stock condition reports and dispositions', true],
  ['disposal.approve', 'Record the financial authorization for a disposal proposal', true],
  ['disposal.complete', 'Record authorized physical disposal completion', true],
  ['disposal.propose', 'Propose stock disposal', true],
  ['evidence.read', 'View authorized stock evidence', true],
  ['intake.record', 'Record opening stock and institutional stock intake', true],
  ['intake_correction.approve', 'Approve or reject an intake correction proposal', true],
  ['intake_correction.propose', 'Propose an intake correction or reversal', true],
  ['loss.confirm', 'Confirm investigated stock as lost', true],
  ['loss.investigate', 'Coordinate and record missing-stock investigation', true],
  ['movement.allocate', 'Allocate central stock to an authorized destination', true],
  ['movement.receive', 'Confirm receipt of an authorized stock movement', true],
  ['movement.release', 'Confirm source release of an authorized stock movement', true],
  ['movement.request', 'Request a stock movement for an authorized destination', true],
  ['reinstatement.approve', 'Approve or reject reinstatement of recovered written-off stock', true],
  ['reinstatement.propose', 'Propose reinstatement of recovered written-off stock', true],
  ['repair.approve', 'Approve or reject recorded repair financial authorization', true],
  ['repair.manage', 'Open and administer operational stock repair cases', true],
  ['stocktake.count', 'Submit an assigned stock-take count or recount', true],
  ['stocktake.finalize', 'Finalize a ready stock-take exercise', true],
  ['stocktake.manage', 'Create, scope, assign, activate, or abort stock-take exercises', true],
  ['stocktake.review', 'Review stock-take completion and verification exceptions', true],
  ['stock.read', 'View authorized stock records', true],
  ['valuation.read', 'View authorized stock valuations', true],
  ['valuation.record', 'Record a supported stock valuation or valuation correction', true],
  ['writeoff.approve', 'Approve or reject a stock write-off proposal', true],
  ['writeoff.propose', 'Propose stock write-off', true],
] as const

const ROLES = [
  {
    key: 'MASTER_ADMIN',
    name: 'Master Admin',
    systemManaged: true,
    permissions: ['access.root'],
    previousPermissions: ['access.root'],
    reason: 'Initial deployment access root',
  },
  {
    key: 'STORE_SUPERVISOR',
    name: 'Store Supervisor',
    systemManaged: false,
    permissions: [
      'catalogue.manage',
      'condition.report',
      'disposal.complete',
      'evidence.read',
      'intake.record',
      'intake_correction.approve',
      'intake_correction.propose',
      'movement.allocate',
      'movement.receive',
      'movement.release',
      'stock.read',
      'valuation.read',
    ],
    previousPermissions: [
      'catalogue.manage',
      'condition.report',
      'disposal.complete',
      'intake.record',
      'intake_correction.approve',
      'intake_correction.propose',
      'movement.allocate',
      'movement.receive',
      'movement.release',
    ],
    reason: 'Initial V1 Store Supervisor starter role',
  },
  {
    key: 'STOCK_SUPERVISOR',
    name: 'Stock Supervisor',
    systemManaged: false,
    permissions: [
      'adjustment.propose',
      'condition.report',
      'condition.review',
      'disposal.propose',
      'evidence.read',
      'loss.confirm',
      'loss.investigate',
      'movement.receive',
      'movement.request',
      'reinstatement.propose',
      'repair.manage',
      'stocktake.finalize',
      'stocktake.manage',
      'stocktake.review',
      'stock.read',
      'valuation.read',
      'writeoff.propose',
    ],
    previousPermissions: [
      'adjustment.propose',
      'condition.report',
      'condition.review',
      'disposal.propose',
      'loss.confirm',
      'loss.investigate',
      'movement.receive',
      'movement.request',
      'reinstatement.propose',
      'repair.manage',
      'stocktake.finalize',
      'stocktake.manage',
      'stocktake.review',
      'writeoff.propose',
    ],
    reason: 'Initial V1 Stock Supervisor starter role',
  },
  {
    key: 'FINANCE_SUPERVISOR',
    name: 'Finance Supervisor',
    systemManaged: false,
    permissions: [
      'adjustment.approve',
      'disposal.approve',
      'evidence.read',
      'reinstatement.approve',
      'repair.approve',
      'stock.read',
      'valuation.read',
      'valuation.record',
      'writeoff.approve',
    ],
    previousPermissions: [
      'adjustment.approve',
      'disposal.approve',
      'reinstatement.approve',
      'repair.approve',
      'valuation.record',
      'writeoff.approve',
    ],
    reason: 'Initial V1 Finance Supervisor starter role',
  },
  {
    key: 'STOCK_TAKER',
    name: 'Stock Taker',
    systemManaged: false,
    permissions: ['condition.report', 'stock.read', 'stocktake.count'],
    previousPermissions: ['condition.report', 'stocktake.count'],
    reason: 'Initial V1 Stock Taker starter role',
  },
] as const

export default class extends BaseSeeder {
  private async ensurePermission(
    definition: (typeof PERMISSIONS)[number],
    trx: TransactionClientContract
  ) {
    const [key, description, customRoleAssignable] = definition
    const permission = await Permission.query({ client: trx }).where('key', key).first()

    if (!permission) {
      await Permission.create({ key, description, customRoleAssignable }, { client: trx })
      return
    }

    if (permission.customRoleAssignable !== customRoleAssignable) {
      throw new Error(`Permission ${key} has incompatible custom-role assignability`)
    }
  }

  private sameKeys(actual: string[], expected: readonly string[]) {
    const sortedExpected = [...expected].sort()

    return (
      actual.length === sortedExpected.length &&
      actual.every((key, index) => key === sortedExpected[index])
    )
  }

  private async createRoleVersion(
    role: Role,
    version: number,
    permissions: readonly string[],
    reason: string,
    trx: TransactionClientContract
  ) {
    const createdVersion = await RoleVersion.create(
      {
        roleId: role.id,
        version,
        reason,
        createdByAccountId: null,
      },
      { client: trx }
    )
    await RoleVersionPermission.createMany(
      permissions.map((permissionKey) => ({
        roleVersionId: createdVersion.id,
        permissionKey,
      })),
      { client: trx }
    )
  }

  private async ensureRole(definition: (typeof ROLES)[number], trx: TransactionClientContract) {
    let role = await Role.query({ client: trx }).where('key', definition.key).first()

    if (!role) {
      role = await Role.create(
        {
          key: definition.key,
          name: definition.name,
          systemManaged: definition.systemManaged,
        },
        { client: trx }
      )
    } else if (role.systemManaged !== definition.systemManaged) {
      throw new Error(`Role ${definition.key} has incompatible system-management metadata`)
    }

    const version = await RoleVersion.query({ client: trx })
      .where('role_id', role.id)
      .orderBy('version', 'desc')
      .first()

    if (!version) {
      await this.createRoleVersion(role, 1, definition.permissions, definition.reason, trx)
      return
    }

    const memberships = await RoleVersionPermission.query({ client: trx })
      .where('role_version_id', version.id)
      .orderBy('permission_key', 'asc')
    const actual = memberships.map(({ permissionKey }) => permissionKey)
    if (this.sameKeys(actual, definition.permissions)) {
      return
    }

    if (
      version.createdByAccountId === null &&
      this.sameKeys(actual, definition.previousPermissions)
    ) {
      await this.createRoleVersion(
        role,
        Number(version.version) + 1,
        definition.permissions,
        'Week 4 stock-read starter role update',
        trx
      )
    }
  }

  async run() {
    await db.transaction(async (trx) => {
      for (const permission of PERMISSIONS) {
        await this.ensurePermission(permission, trx)
      }
      for (const role of ROLES) {
        await this.ensureRole(role, trx)
      }
    })
  }
}
