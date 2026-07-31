import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import PhysicalLocation from '#models/physical_location'
import PhysicalLocationVersion from '#models/physical_location_version'
import AccessEventService from '#services/access_event_service'
import type { RequestAuditContext } from '#types/access'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class PhysicalLocationHistoryService {
  constructor(private accessEvents: AccessEventService) {}

  private lockCurrentVersion(trx: TransactionClientContract, locationId: string) {
    return PhysicalLocationVersion.query({ client: trx })
      .where('physical_location_id', locationId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: PhysicalLocationVersion, proposed: DateTime<true>) {
    return proposed <= current.effectiveFrom
      ? current.effectiveFrom.plus({ milliseconds: 1 })
      : proposed
  }

  /** Records the first effective structural snapshot for a newly created physical location. */
  createInitialVersion(
    location: PhysicalLocation,
    reason: string,
    actorAccountId: string,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return PhysicalLocationVersion.create(
      {
        physicalLocationId: location.id,
        version: 1,
        name: location.name,
        parentId: location.parentId,
        archivedAt: location.archivedAt,
        effectiveFrom,
        effectiveTo: null,
        changedByAccountId: actorAccountId,
        reason,
      },
      { client: trx }
    )
  }

  /** Closes the current snapshot and appends the location's next effective structural version. */
  async appendVersion(
    location: PhysicalLocation,
    reason: string,
    actorAccountId: string,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, location.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)

    await current.merge({ effectiveTo: effectiveFrom }).save()

    return PhysicalLocationVersion.create(
      {
        physicalLocationId: location.id,
        version: Number(current.version) + 1,
        name: location.name,
        parentId: location.parentId,
        archivedAt: location.archivedAt,
        effectiveFrom,
        effectiveTo: null,
        changedByAccountId: actorAccountId,
        reason,
      },
      { client: trx }
    )
  }

  /** Appends the access-administration audit event for a physical-location change. */
  recordChange(
    eventType: string,
    location: PhysicalLocation,
    reason: string,
    actorAccountId: string,
    metadata: Record<string, unknown>,
    trx: TransactionClientContract,
    request?: RequestAuditContext
  ) {
    return this.accessEvents.record(
      {
        eventType,
        actorType: 'ACCOUNT',
        actorAccountId,
        targetType: 'PHYSICAL_LOCATION',
        targetId: location.id,
        reason,
        request,
        metadata,
      },
      trx
    )
  }
}
