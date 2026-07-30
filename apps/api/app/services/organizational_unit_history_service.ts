import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import OrganizationalUnit from '#models/organizational_unit'
import OrganizationalUnitVersion from '#models/organizational_unit_version'
import AccessEventService from '#services/access_event_service'
import type { RequestAuditContext } from '#types/access'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class OrganizationalUnitHistoryService {
  constructor(private accessEvents: AccessEventService) {}

  private lockCurrentVersion(trx: TransactionClientContract, unitId: string) {
    return OrganizationalUnitVersion.query({ client: trx })
      .where('organizational_unit_id', unitId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: OrganizationalUnitVersion, proposed: DateTime<true>) {
    return proposed <= current.effectiveFrom
      ? current.effectiveFrom.plus({ milliseconds: 1 })
      : proposed
  }

  /** Records the first effective structural snapshot for a newly created unit. */
  createInitialVersion(
    unit: OrganizationalUnit,
    reason: string,
    actorAccountId: string | null,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return OrganizationalUnitVersion.create(
      {
        organizationalUnitId: unit.id,
        version: 1,
        name: unit.name,
        unitType: unit.unitType,
        parentId: unit.parentId,
        archivedAt: unit.archivedAt,
        effectiveFrom,
        effectiveTo: null,
        changedByAccountId: actorAccountId,
        reason,
      },
      { client: trx }
    )
  }

  /** Closes the current snapshot and appends the unit's next effective structural version. */
  async appendVersion(
    unit: OrganizationalUnit,
    reason: string,
    actorAccountId: string,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, unit.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)

    current.effectiveTo = effectiveFrom
    await current.save()

    return OrganizationalUnitVersion.create(
      {
        organizationalUnitId: unit.id,
        version: Number(current.version) + 1,
        name: unit.name,
        unitType: unit.unitType,
        parentId: unit.parentId,
        archivedAt: unit.archivedAt,
        effectiveFrom,
        effectiveTo: null,
        changedByAccountId: actorAccountId,
        reason,
      },
      { client: trx }
    )
  }

  /** Appends the access-audit event corresponding to an organizational structure change. */
  recordChange(
    eventType: string,
    unit: OrganizationalUnit,
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
        targetType: 'ORGANIZATIONAL_UNIT',
        targetId: unit.id,
        reason,
        request,
        metadata,
      },
      trx
    )
  }
}
