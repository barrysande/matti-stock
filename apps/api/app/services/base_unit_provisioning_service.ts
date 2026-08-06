import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import BaseUnit from '#models/base_unit'
import BaseUnitHistoryService from '#services/base_unit_history_service'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import { resolveBaseUnitDetails } from '#utils/baseunit'
import type { createBaseUnitValidator } from '#validators/base_unit'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_MESSAGE = 'An active base unit already uses this name or symbol.'
const DUPLICATE_CONSTRAINTS = [
  'base_units_active_name_unique',
  'base_units_active_symbol_unique',
] as const

type CreateData = Infer<typeof createBaseUnitValidator>

@inject()
export default class BaseUnitProvisioningService {
  constructor(
    private authority: CatalogueAuthorityService,
    private history: BaseUnitHistoryService
  ) {}

  /** Creates a base unit atomically with its first effective and authorized history snapshot. */
  async create(data: CreateData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const details = resolveBaseUnitDetails(data.name, data.symbol, data.kind, data.precision)
        const unit = await BaseUnit.create({ ...details, archivedAt: null }, { client: trx })

        await this.history.createInitialVersion(
          unit,
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
