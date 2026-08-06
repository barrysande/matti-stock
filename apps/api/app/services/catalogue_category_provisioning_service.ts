import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueCategoryHierarchyService from '#services/catalogue_category_hierarchy_service'
import CatalogueCategoryHistoryService from '#services/catalogue_category_history_service'
import { normalizeCategoryName } from '#utils/category'
import type { createCatalogueCategoryValidator } from '#validators/catalogue_category'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active or merged catalogue category with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = [
  'catalogue_categories_available_top_name_unique',
  'catalogue_categories_available_sibling_name_unique',
] as const

type CreateData = Infer<typeof createCatalogueCategoryValidator>

@inject()
export default class CatalogueCategoryProvisioningService {
  constructor(
    private authority: CatalogueAuthorityService,
    private hierarchy: CatalogueCategoryHierarchyService,
    private history: CatalogueCategoryHistoryService
  ) {}

  /** Creates a category atomically with its first effective and authorized history snapshot. */
  async create(data: CreateData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const categories = await this.hierarchy.lock(trx)
        const parentId = data.parentId ?? null

        this.hierarchy.assertCreateParent(parentId, categories)

        const category = await CatalogueCategory.create(
          {
            name: normalizeCategoryName(data.name),
            description: data.description,
            parentId,
            archivedAt: null,
          },
          { client: trx }
        )

        await this.history.createInitialVersion(
          category,
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return category
      })
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_NAME_MESSAGE, DUPLICATE_NAME_CONSTRAINTS)
    }
  }
}
