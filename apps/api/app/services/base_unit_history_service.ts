import type { DateTime } from 'luxon'
import type BaseUnit from '#models/base_unit'
import BaseUnitVersion from '#models/base_unit_version'
import type { BaseUnitChangeKind, CatalogueAuthorization } from '#types/catalogue'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class BaseUnitHistoryService {
  private lockCurrentVersion(trx: TransactionClientContract, unitId: string) {
    return BaseUnitVersion.query({ client: trx })
      .where('base_unit_id', unitId)
      .whereNull('effective_to')
      .forUpdate()
      .firstOrFail()
  }

  private nextEffectiveTime(current: BaseUnitVersion, proposed: DateTime<true>): DateTime<true> {
    return proposed <= current.effectiveFrom
      ? (current.effectiveFrom.plus({ milliseconds: 1 }) as DateTime<true>)
      : proposed
  }

  private snapshot(
    unit: BaseUnit,
    changeKind: BaseUnitChangeKind,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    effectiveFrom: DateTime<true>,
    version: number
  ) {
    return {
      baseUnitId: unit.id,
      version,
      changeKind,
      name: unit.name,
      symbol: unit.symbol,
      kind: unit.kind,
      precision: unit.precision,
      archivedAt: unit.archivedAt,
      effectiveFrom,
      effectiveTo: null,
      changedByAccountId: actorAccountId,
      authorizationRoleAssignmentId: authorization.grant.assignmentId,
      authorizationDelegationId: authorization.grant.delegationId,
      permissionKey: authorization.grant.permissionKey,
      resolvedScopeOrganizationalUnitId: authorization.instituteOrganizationalUnitId,
      reason,
    }
  }

  /** Records the first effective base-unit snapshot with its exact authorization context. */
  createInitialVersion(
    unit: BaseUnit,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    effectiveFrom: DateTime<true>
  ) {
    return BaseUnitVersion.create(
      this.snapshot(unit, 'CREATED', reason, actorAccountId, authorization, effectiveFrom, 1),
      { client: trx }
    )
  }

  /** Closes the current base-unit snapshot and appends its next effective version. */
  async appendVersion(
    unit: BaseUnit,
    changeKind: Exclude<BaseUnitChangeKind, 'CREATED'>,
    reason: string,
    actorAccountId: string,
    authorization: CatalogueAuthorization,
    trx: TransactionClientContract,
    proposedNow: DateTime<true>
  ) {
    const current = await this.lockCurrentVersion(trx, unit.id)
    const effectiveFrom = this.nextEffectiveTime(current, proposedNow)

    await current.merge({ effectiveTo: effectiveFrom }).save()

    return BaseUnitVersion.create(
      this.snapshot(
        unit,
        changeKind,
        reason,
        actorAccountId,
        authorization,
        effectiveFrom,
        Number(current.version) + 1
      ),
      { client: trx }
    )
  }
}
