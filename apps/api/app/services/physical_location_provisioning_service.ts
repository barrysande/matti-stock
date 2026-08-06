import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidPhysicalLocationChangeException from '#exceptions/invalid_physical_location_change_exception'
import PhysicalLocation from '#models/physical_location'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import PhysicalLocationHistoryService from '#services/physical_location_history_service'
import type { RequestAuditContext } from '#types/access'
import type { createPhysicalLocationValidator } from '#validators/physical_location'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active physical location with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = [
  'physical_locations_active_top_level_name_unique',
  'physical_locations_active_sibling_name_unique',
] as const

type CreateData = Infer<typeof createPhysicalLocationValidator>

@inject()
export default class PhysicalLocationProvisioningService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private history: PhysicalLocationHistoryService
  ) {}

  /**
   * Creates a top-level or nested physical location.
   * Creation is atomic with its initial version and access-administration audit event.
   */
  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)

        await this.rootAuthority.assertEffectiveActor(actor, trx, now)

        const parentId = data.parentId ?? null

        if (parentId) {
          const parent = await PhysicalLocation.query({ client: trx })
            .where('id', parentId)
            .forUpdate()
            .first()

          if (!parent || parent.archivedAt) {
            throw new InvalidPhysicalLocationChangeException(
              'The selected physical-location parent is unavailable.'
            )
          }
        }

        const location = await PhysicalLocation.create(
          {
            name: data.name,
            parentId,
            archivedAt: null,
          },
          { client: trx }
        )
        const version = await this.history.createInitialVersion(
          location,
          data.reason,
          actorAccountId,
          trx,
          now
        )

        await this.history.recordChange(
          'PHYSICAL_LOCATION_CREATED',
          location,
          data.reason,
          actorAccountId,
          {
            version: Number(version.version),
            name: location.name,
            parentId: location.parentId,
          },
          trx,
          request
        )

        return location
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }
}
