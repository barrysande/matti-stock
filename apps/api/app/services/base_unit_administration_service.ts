import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidBaseUnitChangeException from '#exceptions/invalid_base_unit_change_exception'
import BaseUnit from '#models/base_unit'
import BaseUnitHistoryService from '#services/base_unit_history_service'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import { resolveBaseUnitDetails } from '#utils/baseunit'
import type {
  administerBaseUnitValidator,
  updateBaseUnitDetailsValidator,
} from '#validators/base_unit'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_MESSAGE = 'An active base unit already uses this name or symbol.'
const DUPLICATE_CONSTRAINTS = [
  'base_units_active_name_unique',
  'base_units_active_symbol_unique',
] as const

type DetailsData = Infer<typeof updateBaseUnitDetailsValidator>
type AdministerData = Infer<typeof administerBaseUnitValidator>

@inject()
export default class BaseUnitAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private history: BaseUnitHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidBaseUnitChangeException(message)
  }

  private lockUnit(trx: TransactionClientContract, unitId: string) {
    return BaseUnit.query({ client: trx }).where('id', unitId).forUpdate().firstOrFail()
  }

  private assertActive(unit: BaseUnit) {
    if (unit.archivedAt) {
      this.invalid('An archived base unit must be restored before it can be changed.')
    }
  }

  /** Updates an active unused unit; Slice 4 adds the catalogue-reference semantic lock. */
  async updateDetails(unitId: string, data: DetailsData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const unit = await this.lockUnit(trx, unitId)

        this.assertActive(unit)
        const details = resolveBaseUnitDetails(data.name, data.symbol, data.kind, data.precision)

        if (
          unit.name === details.name &&
          unit.symbol === details.symbol &&
          unit.kind === details.kind &&
          Number(unit.precision) === details.precision
        ) {
          this.invalid('The base unit already has these details.')
        }

        if (
          unit.firstUsedAt &&
          (unit.kind !== details.kind || Number(unit.precision) !== details.precision)
        ) {
          this.invalid(
            'A used base unit may have its name or symbol corrected, but its kind and precision require a controlled conversion.'
          )
        }

        await unit.merge(details).save()
        await this.history.appendVersion(
          unit,
          'DETAILS_UPDATED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return unit
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE, DUPLICATE_CONSTRAINTS)
    }
  }

  /** Archives an active base unit without deleting its definition or history. */
  async archive(unitId: string, data: AdministerData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
      const unit = await this.lockUnit(trx, unitId)

      this.assertActive(unit)

      await unit.merge({ archivedAt: now }).save()
      await this.history.appendVersion(
        unit,
        'ARCHIVED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )

      return unit
    })
  }

  /** Restores a base unit only when its name and symbol remain available. */
  async restore(unitId: string, data: AdministerData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const unit = await this.lockUnit(trx, unitId)

        if (!unit.archivedAt) {
          this.invalid('The base unit is not archived.')
        }

        await unit.merge({ archivedAt: null }).save()
        await this.history.appendVersion(
          unit,
          'RESTORED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return unit
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE, DUPLICATE_CONSTRAINTS)
    }
  }
}
