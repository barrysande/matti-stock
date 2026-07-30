import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidRoleChangeException from '#exceptions/invalid_role_change_exception'
import Role from '#models/role'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import EffectiveAccessService from '#services/effective_access_service'
import RoleVersionService from '#services/role_version_service'
import type { RequestAuditContext } from '#types/access'
import type {
  administerRoleValidator,
  renameRoleValidator,
  replaceRolePermissionsValidator,
} from '#validators/role'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE = 'An active role with this name already exists.'
type RenameData = Infer<typeof renameRoleValidator>
type ReplacePermissionsData = Infer<typeof replaceRolePermissionsValidator>
type AdministerData = Infer<typeof administerRoleValidator>

@inject()
export default class RoleAdministrationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private effectiveAccess: EffectiveAccessService,
    private versions: RoleVersionService,
    private accessEvents: AccessEventService
  ) {}

  private invalid(message: string): never {
    throw new InvalidRoleChangeException(message)
  }

  private async lockActor(
    trx: TransactionClientContract,
    actorAccountId: string,
    now: DateTime<true>
  ) {
    const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
    await this.rootAuthority.assertEffectiveActor(actor, trx, now)
  }

  private lockRole(trx: TransactionClientContract, roleId: string) {
    return Role.query({ client: trx }).where('id', roleId).forUpdate().firstOrFail()
  }

  private assertConfigurable(role: Role) {
    if (role.systemManaged) {
      this.invalid('System-managed roles cannot be changed.')
    }
  }

  private assertActive(role: Role) {
    if (role.archivedAt) {
      this.invalid('An archived role must be restored before it can be changed.')
    }
  }

  private async activeOrUpcomingAssignment(
    roleId: string,
    now: DateTime<true>,
    trx: TransactionClientContract
  ) {
    return this.effectiveAccess
      .openAssignments(trx, now)
      .whereHas('roleVersion', (builder) => {
        builder.where('role_id', roleId)
      })
      .forUpdate()
      .first()
  }

  /** Renames an active configurable role without changing its permission authority. */
  async rename(
    roleId: string,
    data: RenameData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        const role = await this.lockRole(trx, roleId)
        this.assertConfigurable(role)
        this.assertActive(role)
        const previousName = role.name

        if (previousName === data.name) {
          this.invalid('The role already uses this name.')
        }

        role.name = data.name
        await role.save()
        await this.accessEvents.record(
          {
            eventType: 'ROLE_RENAMED',
            actorType: 'ACCOUNT',
            actorAccountId,
            targetType: 'ROLE',
            targetId: role.id,
            reason: data.reason,
            request,
            metadata: { previousName, name: role.name },
          },
          trx
        )

        return role
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE)
    }
  }

  /** Creates a new permission version while preserving every assignment to an older version. */
  async replacePermissions(
    roleId: string,
    data: ReplacePermissionsData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      await this.lockActor(trx, actorAccountId, now)
      const role = await this.lockRole(trx, roleId)
      this.assertConfigurable(role)
      this.assertActive(role)
      const result = await this.versions.append(
        role,
        data.permissionKeys,
        data.reason,
        actorAccountId,
        trx
      )

      role.updatedAt = now
      await role.save()
      await this.accessEvents.record(
        {
          eventType: 'ROLE_VERSION_CREATED',
          actorType: 'ACCOUNT',
          actorAccountId,
          targetType: 'ROLE',
          targetId: role.id,
          reason: data.reason,
          request,
          metadata: {
            previousVersionId: result.previousVersion.id,
            previousVersion: Number(result.previousVersion.version),
            previousPermissionKeys: result.previousKeys,
            versionId: result.version.id,
            version: Number(result.version.version),
            permissionKeys: result.permissionKeys,
          },
        },
        trx
      )

      return result.version
    })
  }

  /** Archives a configurable role only after all active and upcoming assignments have ended. */
  async archive(
    roleId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      await this.lockActor(trx, actorAccountId, now)
      const role = await this.lockRole(trx, roleId)
      this.assertConfigurable(role)
      this.assertActive(role)

      if (await this.activeOrUpcomingAssignment(role.id, now, trx)) {
        this.invalid('End active and upcoming assignments before archiving this role.')
      }

      role.archivedAt = now
      await role.save()
      await this.accessEvents.record(
        {
          eventType: 'ROLE_ARCHIVED',
          actorType: 'ACCOUNT',
          actorAccountId,
          targetType: 'ROLE',
          targetId: role.id,
          reason: data.reason,
          request,
          metadata: { archivedAt: role.archivedAt.toISO() },
        },
        trx
      )

      return role
    })
  }

  /** Restores an archived configurable role without changing its latest permission version. */
  async restore(
    roleId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        const role = await this.lockRole(trx, roleId)
        this.assertConfigurable(role)

        if (!role.archivedAt) {
          this.invalid('The role is not archived.')
        }

        const previousArchivedAt = role.archivedAt
        role.archivedAt = null
        await role.save()
        await this.accessEvents.record(
          {
            eventType: 'ROLE_RESTORED',
            actorType: 'ACCOUNT',
            actorAccountId,
            targetType: 'ROLE',
            targetId: role.id,
            reason: data.reason,
            request,
            metadata: { previousArchivedAt: previousArchivedAt.toISO() },
          },
          trx
        )

        return role
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE)
    }
  }
}
