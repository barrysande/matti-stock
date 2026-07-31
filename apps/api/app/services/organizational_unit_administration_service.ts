import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidOrganizationalUnitChangeException from '#exceptions/invalid_organizational_unit_change_exception'
import StaleOrganizationalAccessImpactException from '#exceptions/stale_organizational_access_impact_exception'
import OrganizationalUnit from '#models/organizational_unit'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import OrganizationalAccessImpactService from '#services/organizational_access_impact_service'
import OrganizationalUnitHistoryService from '#services/organizational_unit_history_service'
import OrganizationalUnitNameService from '#services/organizational_unit_name_service'
import type { RequestAuditContext } from '#types/access'
import type { OrganizationalImpactRequest } from '#types/organization'
import type {
  administerOrganizationalUnitValidator,
  renameOrganizationalUnitValidator,
  reparentOrganizationalUnitValidator,
} from '#validators/organizational_unit'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active organizational unit with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = ['organizational_units_active_sibling_name_unique'] as const

type RenameData = Infer<typeof renameOrganizationalUnitValidator>
type ReparentData = Infer<typeof reparentOrganizationalUnitValidator>
type AdministerData = Infer<typeof administerOrganizationalUnitValidator>

@inject()
export default class OrganizationalUnitAdministrationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private accessImpact: OrganizationalAccessImpactService,
    private history: OrganizationalUnitHistoryService,
    private unitNames: OrganizationalUnitNameService
  ) {}

  private invalid(message: string): never {
    throw new InvalidOrganizationalUnitChangeException(message)
  }

  private async lockActor(
    trx: TransactionClientContract,
    actorAccountId: string,
    now: DateTime<true>
  ) {
    const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
    await this.rootAuthority.assertEffectiveActor(actor, trx, now)
  }

  private lockUnit(trx: TransactionClientContract, unitId: string) {
    return OrganizationalUnit.query({ client: trx }).where('id', unitId).forUpdate().firstOrFail()
  }

  private async assertImpact(
    request: OrganizationalImpactRequest,
    expectedFingerprint: string,
    trx: TransactionClientContract,
    now: DateTime<true>
  ) {
    const impact = await this.accessImpact.preview(request, trx, now)
    if (impact.fingerprint !== expectedFingerprint) {
      throw new StaleOrganizationalAccessImpactException()
    }

    return impact
  }

  /** Renames a unit while preserving its prior effective name in version history. */
  async rename(
    unitId: string,
    data: RenameData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        const unit = await this.lockUnit(trx, unitId)
        const previousName = unit.name
        const name = this.unitNames.normalize(data.name, unit.unitType)

        if (previousName === name) {
          this.invalid('The organizational unit already uses this name.')
        }

        await unit.merge({ name }).save()
        const version = await this.history.appendVersion(
          unit,
          data.reason,
          actorAccountId,
          trx,
          now
        )
        await this.history.recordChange(
          'ORGANIZATIONAL_UNIT_RENAMED',
          unit,
          data.reason,
          actorAccountId,
          { previousName, name: unit.name, version: Number(version.version) },
          trx,
          request
        )

        return unit
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }

  /**
   * Moves a sub-department between departments after revalidating the reviewed access impact.
   */
  async reparent(
    unitId: string,
    data: ReparentData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        await this.assertImpact(
          { operation: 'REPARENT', targetUnitId: unitId, parentId: data.parentId },
          data.impactFingerprint,
          trx,
          now
        )
        const unit = await this.lockUnit(trx, unitId)
        const previousParentId = unit.parentId

        await unit.merge({ parentId: data.parentId }).save()
        const version = await this.history.appendVersion(
          unit,
          data.reason,
          actorAccountId,
          trx,
          now
        )
        await this.history.recordChange(
          'ORGANIZATIONAL_UNIT_REPARENTED',
          unit,
          data.reason,
          actorAccountId,
          {
            previousParentId,
            parentId: unit.parentId,
            version: Number(version.version),
          },
          trx,
          request
        )

        return unit
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }

  /** Archives an empty non-root branch without deleting its assignments or history. */
  async archive(
    unitId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      await this.lockActor(trx, actorAccountId, now)
      await this.assertImpact(
        { operation: 'ARCHIVE', targetUnitId: unitId },
        data.impactFingerprint,
        trx,
        now
      )
      const unit = await this.lockUnit(trx, unitId)

      await unit.merge({ archivedAt: now }).save()
      const version = await this.history.appendVersion(unit, data.reason, actorAccountId, trx, now)
      await this.history.recordChange(
        'ORGANIZATIONAL_UNIT_ARCHIVED',
        unit,
        data.reason,
        actorAccountId,
        { archivedAt: now.toISO(), version: Number(version.version) },
        trx,
        request
      )

      return unit
    })
  }

  /** Restores an archived unit after confirming that its parent and access preview remain valid. */
  async restore(
    unitId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        await this.lockActor(trx, actorAccountId, now)
        await this.assertImpact(
          { operation: 'RESTORE', targetUnitId: unitId },
          data.impactFingerprint,
          trx,
          now
        )
        const unit = await this.lockUnit(trx, unitId)
        const previousArchivedAt = unit.archivedAt

        await unit.merge({ archivedAt: null }).save()
        const version = await this.history.appendVersion(
          unit,
          data.reason,
          actorAccountId,
          trx,
          now
        )
        await this.history.recordChange(
          'ORGANIZATIONAL_UNIT_RESTORED',
          unit,
          data.reason,
          actorAccountId,
          {
            previousArchivedAt: previousArchivedAt?.toISO() ?? null,
            version: Number(version.version),
          },
          trx,
          request
        )

        return unit
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }
}
