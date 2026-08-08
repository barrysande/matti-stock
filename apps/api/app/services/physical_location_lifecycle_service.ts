import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidPhysicalLocationChangeException from '#exceptions/invalid_physical_location_change_exception'
import PhysicalLocation from '#models/physical_location'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import CentralStoreContextDirectoryService from '#services/central_store_context_directory_service'
import PhysicalLocationHistoryService from '#services/physical_location_history_service'
import type { RequestAuditContext } from '#types/access'
import type { administerPhysicalLocationValidator } from '#validators/physical_location'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active physical location with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = [
  'physical_locations_active_top_level_name_unique',
  'physical_locations_active_sibling_name_unique',
] as const

type AdministerData = Infer<typeof administerPhysicalLocationValidator>

@inject()
export default class PhysicalLocationLifecycleService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private contexts: CentralStoreContextDirectoryService,
    private history: PhysicalLocationHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidPhysicalLocationChangeException(message)
  }

  private async lockActor(
    trx: TransactionClientContract,
    actorAccountId: string,
    now: DateTime<true>
  ) {
    const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)

    await this.rootAuthority.assertEffectiveActor(actor, trx, now)
  }

  private lockLocation(trx: TransactionClientContract, locationId: string) {
    return PhysicalLocation.query({ client: trx }).where('id', locationId).forUpdate().firstOrFail()
  }

  /** Archives an active location only when it is not the configured Central Store location. */
  async archive(
    locationId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()

      await this.lockActor(trx, actorAccountId, now)
      const context = await this.contexts.latest(trx, true)
      const location = await this.lockLocation(trx, locationId)

      if (location.archivedAt) {
        this.invalid('The physical location is already archived.')
      }

      if (context?.physicalLocationId === location.id) {
        this.invalid(
          'Configure a different Central Store physical location before archiving this location.'
        )
      }

      const activeChild = await PhysicalLocation.query({ client: trx })
        .where('parent_id', location.id)
        .whereNull('archived_at')
        .forUpdate()
        .first()

      if (activeChild) {
        this.invalid('Archive or move active child locations before archiving this location.')
      }

      await location.merge({ archivedAt: now }).save()

      const version = await this.history.appendVersion(
        location,
        data.reason,
        actorAccountId,
        trx,
        now
      )

      await this.history.recordChange(
        'PHYSICAL_LOCATION_ARCHIVED',
        location,
        data.reason,
        actorAccountId,
        { archivedAt: now.toISO(), version: Number(version.version) },
        trx,
        request
      )

      return location
    })
  }

  /** Restores a location after confirming that its parent is currently active. */
  async restore(
    locationId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()

        await this.lockActor(trx, actorAccountId, now)
        const location = await this.lockLocation(trx, locationId)

        if (!location.archivedAt) {
          this.invalid('The physical location is not archived.')
        }

        if (location.parentId) {
          const parent = await PhysicalLocation.query({ client: trx })
            .where('id', location.parentId)
            .forUpdate()
            .first()

          if (!parent || parent.archivedAt) {
            this.invalid('Restore the parent location before restoring this location.')
          }
        }

        const previousArchivedAt = location.archivedAt

        await location.merge({ archivedAt: null }).save()
        const version = await this.history.appendVersion(
          location,
          data.reason,
          actorAccountId,
          trx,
          now
        )

        await this.history.recordChange(
          'PHYSICAL_LOCATION_RESTORED',
          location,
          data.reason,
          actorAccountId,
          {
            previousArchivedAt: previousArchivedAt.toISO(),
            version: Number(version.version),
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
