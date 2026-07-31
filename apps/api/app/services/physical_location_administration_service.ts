import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidPhysicalLocationChangeException from '#exceptions/invalid_physical_location_change_exception'
import PhysicalLocation from '#models/physical_location'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import PhysicalLocationHistoryService from '#services/physical_location_history_service'
import type { RequestAuditContext } from '#types/access'
import type {
  administerPhysicalLocationValidator,
  renamePhysicalLocationValidator,
  reparentPhysicalLocationValidator,
} from '#validators/physical_location'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active physical location with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = [
  'physical_locations_active_top_level_name_unique',
  'physical_locations_active_sibling_name_unique',
] as const

type RenameData = Infer<typeof renamePhysicalLocationValidator>
type ReparentData = Infer<typeof reparentPhysicalLocationValidator>
type AdministerData = Infer<typeof administerPhysicalLocationValidator>

@inject()
export default class PhysicalLocationAdministrationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
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

  private assertActive(location: PhysicalLocation) {
    if (location.archivedAt) {
      this.invalid('An archived physical location must be restored before it can be changed.')
    }
  }

  private async assertValidParent(
    location: PhysicalLocation,
    parentId: string | null,
    trx: TransactionClientContract
  ) {
    if (!parentId) {
      return
    }

    if (parentId === location.id) {
      this.invalid('A physical location cannot be its own parent.')
    }

    const parent = await PhysicalLocation.query({ client: trx })
      .where('id', parentId)
      .forUpdate()
      .first()
    if (!parent || parent.archivedAt) {
      this.invalid('The selected physical-location parent is unavailable.')
    }

    const hierarchy = await PhysicalLocation.query({ client: trx }).select('id', 'parent_id')
    const locations = new Map(hierarchy.map((candidate) => [candidate.id, candidate]))
    const visited = new Set<string>()
    let cursor: PhysicalLocation | undefined = parent

    while (cursor) {
      if (cursor.id === location.id) {
        this.invalid('A physical location cannot be moved beneath one of its descendants.')
      }
      if (visited.has(cursor.id)) {
        this.invalid('The physical-location hierarchy contains a circular parent relationship.')
      }

      visited.add(cursor.id)
      cursor = cursor.parentId ? locations.get(cursor.parentId) : undefined
    }
  }

  /** Renames an active location while preserving its prior effective name in version history. */
  async rename(
    locationId: string,
    data: RenameData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        const location = await this.lockLocation(trx, locationId)
        this.assertActive(location)
        const previousName = location.name

        if (previousName === data.name) {
          this.invalid('The physical location already uses this name.')
        }

        await location.merge({ name: data.name }).save()
        const version = await this.history.appendVersion(
          location,
          data.reason,
          actorAccountId,
          trx,
          now
        )
        await this.history.recordChange(
          'PHYSICAL_LOCATION_RENAMED',
          location,
          data.reason,
          actorAccountId,
          { previousName, name: location.name, version: Number(version.version) },
          trx,
          request
        )

        return location
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }

  /** Moves an active location to another branch or promotes it to a top-level location. */
  async reparent(
    locationId: string,
    data: ReparentData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        const location = await this.lockLocation(trx, locationId)
        this.assertActive(location)
        const parentId = data.parentId ?? null
        const previousParentId = location.parentId

        if (parentId === previousParentId) {
          this.invalid('The physical location already belongs to the selected parent.')
        }
        await this.assertValidParent(location, parentId, trx)

        await location.merge({ parentId }).save()
        const version = await this.history.appendVersion(
          location,
          data.reason,
          actorAccountId,
          trx,
          now
        )
        await this.history.recordChange(
          'PHYSICAL_LOCATION_REPARENTED',
          location,
          data.reason,
          actorAccountId,
          {
            previousParentId,
            parentId: location.parentId,
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

  /** Archives an active location only after all of its active children have been cleared. */
  async archive(
    locationId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      await this.lockActor(trx, actorAccountId, now)
      const location = await this.lockLocation(trx, locationId)
      this.assertActive(location)

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
