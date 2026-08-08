import CentralStoreContextVersion from '#models/central_store_context_version'
import type { centralStoreContextHistoryValidator } from '#validators/central_store_context'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const CONTEXT_VERSIONS_PER_PAGE = 20

type HistoryData = Infer<typeof centralStoreContextHistoryValidator>

export default class CentralStoreContextDirectoryService {
  private query(client?: TransactionClientContract) {
    const query = client
      ? CentralStoreContextVersion.query({ client })
      : CentralStoreContextVersion.query()

    return query
      .preload('custodialOrganizationalUnit')
      .preload('physicalLocation')
      .preload('configuredByAccount', (accountQuery) => {
        accountQuery.preload('person')
      })
  }

  /** Loads the latest configured version, including inactive historical references. */
  latest(client?: TransactionClientContract, lock = false) {
    const query = this.query(client).orderBy('version', 'desc')

    if (lock) {
      query.forUpdate()
    }

    return query.first()
  }

  /** Loads the current usable context only when both selected records remain active. */
  async current(client?: TransactionClientContract) {
    const context = await this.latest(client)

    if (
      !context ||
      context.custodialOrganizationalUnit.archivedAt ||
      context.physicalLocation.archivedAt
    ) {
      return null
    }

    return context
  }

  /** Lists immutable configuration versions in reverse version order. */
  history(data: HistoryData) {
    return this.query()
      .orderBy('version', 'desc')
      .paginate(data.page ?? 1, CONTEXT_VERSIONS_PER_PAGE)
  }
}
