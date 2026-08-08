import { BaseTransformer } from '@adonisjs/core/transformers'
import type CentralStoreContextVersion from '#models/central_store_context_version'

export default class CentralStoreContextVersionTransformer extends BaseTransformer<CentralStoreContextVersion> {
  toObject() {
    return {
      id: this.resource.id,
      version: Number(this.resource.version),
      custodialOrganizationalUnit: {
        id: this.resource.custodialOrganizationalUnitId,
        name: this.resource.custodialOrganizationalUnit.name,
      },
      physicalLocation: {
        id: this.resource.physicalLocationId,
        name: this.resource.physicalLocation.name,
      },
      effectiveFrom: this.resource.effectiveFrom,
      reason: this.resource.reason,
      configuredBy: {
        accountId: this.resource.configuredByAccountId,
        displayName: this.resource.configuredByAccount.person.displayName,
      },
      createdAt: this.resource.createdAt,
    }
  }
}
