import type CentralStoreContextVersion from '#models/central_store_context_version'
import type { EffectiveAccessGrant } from '#types/role_assignment'

export interface CentralStoreIntakeAuthorization {
  context: CentralStoreContextVersion
  grant: EffectiveAccessGrant
}
