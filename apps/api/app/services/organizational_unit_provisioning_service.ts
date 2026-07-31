import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import StaleOrganizationalAccessImpactException from '#exceptions/stale_organizational_access_impact_exception'
import OrganizationalUnit from '#models/organizational_unit'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import OrganizationalAccessImpactService from '#services/organizational_access_impact_service'
import OrganizationalUnitHistoryService from '#services/organizational_unit_history_service'
import type { RequestAuditContext } from '#types/access'
import type { createOrganizationalUnitValidator } from '#validators/organizational_unit'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active organizational unit with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = ['organizational_units_active_sibling_name_unique'] as const

type CreateData = Infer<typeof createOrganizationalUnitValidator>

@inject()
export default class OrganizationalUnitProvisioningService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private accessImpact: OrganizationalAccessImpactService,
    private history: OrganizationalUnitHistoryService
  ) {}

  /**
   * Creates a department or sub-department within the strict hierarchy.
   * Creation is atomic with its initial version and access audit event.
   */
  async create(data: CreateData, actorAccountId: string, request?: RequestAuditContext) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)
        await this.rootAuthority.assertEffectiveActor(actor, trx, now)

        const impact = await this.accessImpact.preview(
          {
            operation: 'CREATE_CHILD',
            targetUnitId: data.parentId,
            childUnitType: data.unitType,
          },
          trx,
          now
        )
        if (impact.fingerprint !== data.impactFingerprint) {
          throw new StaleOrganizationalAccessImpactException()
        }

        const unit = await OrganizationalUnit.create(
          {
            name: data.name,
            unitType: data.unitType,
            parentId: data.parentId,
            archivedAt: null,
          },
          { client: trx }
        )
        const version = await this.history.createInitialVersion(
          unit,
          data.reason,
          actorAccountId,
          trx,
          now
        )

        await this.history.recordChange(
          'ORGANIZATIONAL_UNIT_CREATED',
          unit,
          data.reason,
          actorAccountId,
          {
            version: Number(version.version),
            name: unit.name,
            unitType: unit.unitType,
            parentId: unit.parentId,
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
