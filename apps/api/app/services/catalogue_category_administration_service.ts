import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCatalogueCategoryChangeException from '#exceptions/invalid_catalogue_category_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CatalogueCategoryHierarchyService from '#services/catalogue_category_hierarchy_service'
import CatalogueCategoryHistoryService from '#services/catalogue_category_history_service'
import { normalizeCategoryName } from '#utils/category'
import type {
  administerCatalogueCategoryValidator,
  reparentCatalogueCategoryValidator,
  updateCatalogueCategoryDetailsValidator,
} from '#validators/catalogue_category'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_NAME_MESSAGE =
  'An active catalogue category with this name already exists under the selected parent.'
const DUPLICATE_NAME_CONSTRAINTS = [
  'catalogue_categories_active_top_level_name_unique',
  'catalogue_categories_active_sibling_name_unique',
] as const

type DetailsData = Infer<typeof updateCatalogueCategoryDetailsValidator>
type ReparentData = Infer<typeof reparentCatalogueCategoryValidator>
type AdministerData = Infer<typeof administerCatalogueCategoryValidator>

@inject()
export default class CatalogueCategoryAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private hierarchy: CatalogueCategoryHierarchyService,
    private history: CatalogueCategoryHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCatalogueCategoryChangeException(message)
  }

  private lockCategory(trx: TransactionClientContract, categoryId: string) {
    return CatalogueCategory.query({ client: trx })
      .where('id', categoryId)
      .forUpdate()
      .firstOrFail()
  }

  private assertActive(category: CatalogueCategory) {
    if (category.archivedAt) {
      this.invalid('An archived catalogue category must be restored before it can be changed.')
    }
  }

  /** Updates an active category's name and required explanatory description. */
  async updateDetails(categoryId: string, data: DetailsData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const category = await this.lockCategory(trx, categoryId)
        this.assertActive(category)
        const name = normalizeCategoryName(data.name)

        if (category.name === name && category.description === data.description) {
          this.invalid('The catalogue category already has these details.')
        }

        await category.merge({ name, description: data.description }).save()
        await this.history.appendVersion(
          category,
          'DETAILS_UPDATED',
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

  /** Moves an active category while serializing and validating the complete three-level tree. */
  async reparent(categoryId: string, data: ReparentData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const categories = await this.hierarchy.lock(trx)
        const category = categories.find((candidate) => candidate.id === categoryId)
        if (!category) {
          return await this.lockCategory(trx, categoryId)
        }
        this.assertActive(category)
        const parentId = data.parentId ?? null

        if (category.parentId === parentId) {
          this.invalid('The catalogue category already belongs to the selected parent.')
        }
        this.hierarchy.assertReparent(category, parentId, categories)

        await category.merge({ parentId }).save()
        await this.history.appendVersion(
          category,
          'REPARENTED',
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

  /** Archives an active category only after its active children have been cleared. */
  async archive(categoryId: string, data: AdministerData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      const categories = await this.hierarchy.lock(trx)
      const category = categories.find((candidate) => candidate.id === categoryId)
      if (!category) return this.lockCategory(trx, categoryId)
      this.assertActive(category)
      this.hierarchy.assertNoActiveChildren(category, categories)

      await category.merge({ archivedAt: now }).save()

      await this.history.appendVersion(
        category,
        'ARCHIVED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )
      return category
    })
  }

  /** Restores a category after validating its current parent and active sibling name. */
  async restore(categoryId: string, data: AdministerData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const categories = await this.hierarchy.lock(trx)
        const category = categories.find((candidate) => candidate.id === categoryId)
        if (!category) return this.lockCategory(trx, categoryId)

        if (!category.archivedAt) {
          this.invalid('The catalogue category is not archived.')
        }
        this.hierarchy.assertRestorableParent(category, categories)

        await category.merge({ archivedAt: null }).save()

        await this.history.appendVersion(
          category,
          'RESTORED',
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
