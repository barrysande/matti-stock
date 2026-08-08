import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import InvalidCentralStoreContextChangeException from '#exceptions/invalid_central_store_context_change_exception'
import CentralStoreContextVersion from '#models/central_store_context_version'
import OrganizationalUnit from '#models/organizational_unit'
import PhysicalLocation from '#models/physical_location'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import CentralStoreContextDirectoryService from '#services/central_store_context_directory_service'
import type { configureCentralStoreContextValidator } from '#validators/central_store_context'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type ConfigureData = Infer<typeof configureCentralStoreContextValidator>

@inject()
export default class CentralStoreContextConfigurationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private contexts: CentralStoreContextDirectoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCentralStoreContextChangeException(message)
  }

  private lockOrganizationalUnit(trx: TransactionClientContract, unitId: string) {
    return OrganizationalUnit.query({ client: trx }).where('id', unitId).forUpdate().first()
  }

  private lockPhysicalLocation(trx: TransactionClientContract, locationId: string) {
    return PhysicalLocation.query({ client: trx }).where('id', locationId).forUpdate().first()
  }

  /** Appends one immediate configuration version under revalidated root authority. */
  configure(data: ConfigureData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const actor = await this.rootAuthority.lockAdministrationActor(trx, actorAccountId)

      await this.rootAuthority.assertEffectiveActor(actor, trx, now)
      const current = await this.contexts.latest(trx, true)
      const organizationalUnit = await this.lockOrganizationalUnit(
        trx,
        data.custodialOrganizationalUnitId
      )
      const physicalLocation = await this.lockPhysicalLocation(trx, data.physicalLocationId)

      if (!organizationalUnit || organizationalUnit.archivedAt) {
        this.invalid('Select an active custodial organizational unit.')
      }

      if (!physicalLocation || physicalLocation.archivedAt) {
        this.invalid('Select an active physical location.')
      }

      if (
        current?.custodialOrganizationalUnitId === organizationalUnit.id &&
        current.physicalLocationId === physicalLocation.id
      ) {
        this.invalid('The Central Store context already uses these records.')
      }

      const context = await CentralStoreContextVersion.create(
        {
          version: current ? Number(current.version) + 1 : 1,
          custodialOrganizationalUnitId: organizationalUnit.id,
          physicalLocationId: physicalLocation.id,
          configuredByAccountId: actor.id,
          reason: data.reason,
          effectiveFrom: now,
        },
        { client: trx }
      )

      await context.load('custodialOrganizationalUnit')
      await context.load('physicalLocation')
      await context.load('configuredByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })

      return context
    })
  }
}
