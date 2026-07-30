import { randomUUID } from 'node:crypto'
import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import Role from '#models/role'
import AccessEventService from '#services/access_event_service'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import RoleVersionService from '#services/role_version_service'
import type { RequestAuditContext } from '#types/access'
import type { createRoleValidator } from '#validators/role'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE = 'An active role with this name already exists.'
type CreateData = Infer<typeof createRoleValidator>

@inject()
export default class RoleProvisioningService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private versions: RoleVersionService,
    private accessEvents: AccessEventService
  ) {}

  private customKey() {
    return `CUSTOM_${randomUUID().replaceAll('-', '').toUpperCase()}`
  }

  /** Creates a configurable reusable role with its immutable first permission version. */
  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
        await this.rootAuthority.assertEffectiveActor(actor, trx, now)
        const role = await Role.create(
          {
            key: this.customKey(),
            name: data.name,
            systemManaged: false,
            archivedAt: null,
          },
          { client: trx }
        )
        const result = await this.versions.createInitial(
          role,
          data.permissionKeys,
          data.reason,
          actorAccountId,
          trx
        )

        await this.accessEvents.record(
          {
            eventType: 'ROLE_CREATED',
            actorType: 'ACCOUNT',
            actorAccountId,
            targetType: 'ROLE',
            targetId: role.id,
            reason: data.reason,
            request,
            metadata: {
              key: role.key,
              name: role.name,
              versionId: result.version.id,
              version: Number(result.version.version),
              permissionKeys: result.permissionKeys,
            },
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
