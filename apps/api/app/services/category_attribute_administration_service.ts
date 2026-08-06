import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCategoryAttributeChangeException from '#exceptions/invalid_category_attribute_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import CatalogueItem from '#models/catalogue_item'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CategoryAttributeHistoryService from '#services/category_attribute_history_service'
import {
  normalizeCategoryAttributeName,
  resolveCategoryAttributeDescription,
} from '#utils/category_attribute'
import type {
  administerCategoryAttributeValidator,
  updateCategoryAttributeDetailsValidator,
} from '#validators/category_attribute'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const ATTRIBUTE_DUPLICATE_CONSTRAINTS = ['category_attributes_active_category_name_unique'] as const

type DetailsData = Infer<typeof updateCategoryAttributeDetailsValidator>
type AdministerData = Infer<typeof administerCategoryAttributeValidator>

@inject()
export default class CategoryAttributeAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private attributeHistory: CategoryAttributeHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCategoryAttributeChangeException(message)
  }

  private lockAttribute(trx: TransactionClientContract, attributeId: string) {
    return CategoryAttribute.query({ client: trx })
      .where('id', attributeId)
      .forUpdate()
      .firstOrFail()
  }

  private lockChoices(trx: TransactionClientContract, attributeId: string) {
    return CategoryAttributeChoice.query({ client: trx })
      .where('category_attribute_id', attributeId)
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private async assertActiveCategory(trx: TransactionClientContract, categoryId: string) {
    const category = await CatalogueCategory.query({ client: trx })
      .where('id', categoryId)
      .forUpdate()
      .firstOrFail()

    if (category.archivedAt) this.invalid('The selected catalogue category is archived.')
  }

  private assertActive(attribute: CategoryAttribute) {
    if (attribute.archivedAt) {
      this.invalid('An archived category attribute must be restored before it can be changed.')
    }
  }

  async updateDetails(attributeId: string, data: DetailsData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const attribute = await this.lockAttribute(trx, attributeId)

        this.assertActive(attribute)

        const name = normalizeCategoryAttributeName(data.name)
        const description = resolveCategoryAttributeDescription(data.description)

        if (attribute.name === name && attribute.description === description) {
          this.invalid('The category attribute already has these details.')
        }

        await attribute.merge({ name, description }).save()

        await this.attributeHistory.appendVersion(
          attribute,
          'DETAILS_UPDATED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return attribute
      })
    } catch (error) {
      DuplicateException.throwIf(
        error,
        'An active category attribute with this name already exists in the selected category.',
        ATTRIBUTE_DUPLICATE_CONSTRAINTS
      )
    }
  }

  async archive(attributeId: string, data: AdministerData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      const attribute = await this.lockAttribute(trx, attributeId)

      this.assertActive(attribute)

      await attribute.merge({ archivedAt: now }).save()

      await this.attributeHistory.appendVersion(
        attribute,
        'ARCHIVED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )

      return attribute
    })
  }

  async restore(attributeId: string, data: AdministerData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        const attribute = await this.lockAttribute(trx, attributeId)

        if (!attribute.archivedAt) {
          this.invalid('The category attribute is not archived.')
        }

        await this.assertActiveCategory(trx, attribute.catalogueCategoryId)

        if (attribute.dataType === 'PREDEFINED_CHOICE') {
          const choices = await this.lockChoices(trx, attribute.id)

          if (!choices.some((choice) => !choice.archivedAt)) {
            this.invalid('A predefined-choice attribute requires at least one active choice.')
          }
        }

        const affectedItemExists = Boolean(
          await CatalogueItem.query({ client: trx })
            .where('catalogue_category_id', attribute.catalogueCategoryId)
            .first()
        )

        if (attribute.isRequired) {
          const itemMissingValue = await CatalogueItem.query({ client: trx })
            .where('catalogue_category_id', attribute.catalogueCategoryId)
            .whereDoesntHave('attributeValues', (valueQuery) => {
              valueQuery.where('category_attribute_id', attribute.id)
            })
            .first()

          if (itemMissingValue) {
            this.invalid(
              'A required catalogue attribute cannot be restored while an affected catalogue item lacks a value.'
            )
          }
        }

        await attribute
          .merge({
            archivedAt: null,
            semanticsLockedAt: attribute.semanticsLockedAt ?? (affectedItemExists ? now : null),
          })
          .save()

        await this.attributeHistory.appendVersion(
          attribute,
          'RESTORED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return attribute
      })
    } catch (error) {
      DuplicateException.throwIf(
        error,
        'An active category attribute with this name already exists in the selected category.',
        ATTRIBUTE_DUPLICATE_CONSTRAINTS
      )
    }
  }
}
