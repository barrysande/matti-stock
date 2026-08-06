import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCategoryAttributeChangeException from '#exceptions/invalid_category_attribute_change_exception'
import InvalidCategoryAttributeChoiceChangeException from '#exceptions/invalid_category_attribute_choice_change_exception'
import CatalogueCategory from '#models/catalogue_category'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CategoryAttributeChoiceHistoryService from '#services/category_attribute_choice_history_service'
import CategoryAttributeHistoryService from '#services/category_attribute_history_service'
import {
  normalizeCategoryAttributeChoiceLabel,
  normalizeCategoryAttributeName,
  resolveCategoryAttributeDescription,
} from '#utils/category_attribute'
import type { createCategoryAttributeValidator } from '#validators/category_attribute'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const ATTRIBUTE_DUPLICATE_CONSTRAINTS = ['category_attributes_active_category_name_unique'] as const
const CHOICE_DUPLICATE_CONSTRAINTS = [
  'category_attribute_choices_active_label_unique',
  'category_attribute_choices_active_order_unique',
] as const

type CreateData = Infer<typeof createCategoryAttributeValidator>

@inject()
export default class CategoryAttributeProvisioningService {
  constructor(
    private authority: CatalogueAuthorityService,
    private attributeHistory: CategoryAttributeHistoryService,
    private choiceHistory: CategoryAttributeChoiceHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCategoryAttributeChangeException(message)
  }

  private invalidChoice(message: string): never {
    throw new InvalidCategoryAttributeChoiceChangeException(message)
  }

  private normalizeChoices(data: CreateData) {
    if (data.dataType !== 'PREDEFINED_CHOICE') {
      if (data.choices)
        this.invalid('Choices may only be supplied for a predefined-choice attribute.')
      return []
    }
    if (!data.choices?.length) {
      this.invalid('A predefined-choice attribute requires at least one active choice.')
    }

    const labels = data.choices.map((choice) => normalizeCategoryAttributeChoiceLabel(choice.label))
    const keys = labels.map((label) => label.toLowerCase())
    if (new Set(keys).size !== keys.length) {
      this.invalidChoice('Predefined-choice labels must be unique within the attribute.')
    }
    return labels
  }

  private async lockActiveCategory(categoryId: string, trx: TransactionClientContract) {
    const category = await CatalogueCategory.query({ client: trx })
      .where('id', categoryId)
      .forUpdate()
      .firstOrFail()
    if (category.archivedAt) {
      this.invalid('The selected catalogue category is archived.')
    }
    return category
  }

  async create(data: CreateData, actorAccountId: string) {
    const labels = this.normalizeChoices(data)
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        await this.lockActiveCategory(data.catalogueCategoryId, trx)

        const attribute = await CategoryAttribute.create(
          {
            catalogueCategoryId: data.catalogueCategoryId,
            name: normalizeCategoryAttributeName(data.name),
            description: resolveCategoryAttributeDescription(data.description),
            dataType: data.dataType,
            isRequired: data.isRequired,
            scope: data.scope,
            semanticsLockedAt: null,
            archivedAt: null,
          },
          { client: trx }
        )
        await this.attributeHistory.createInitialVersion(
          attribute,
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        for (const [index, label] of labels.entries()) {
          const choice = await CategoryAttributeChoice.create(
            {
              categoryAttributeId: attribute.id,
              label,
              displayOrder: index + 1,
              firstUsedAt: null,
              archivedAt: null,
            },
            { client: trx }
          )
          await this.choiceHistory.createInitialVersion(
            choice,
            data.reason,
            actorAccountId,
            authorization,
            trx,
            now
          )
        }

        return attribute
      })
    } catch (error) {
      if (DuplicateException.is(error, ATTRIBUTE_DUPLICATE_CONSTRAINTS)) {
        throw new DuplicateException(
          'An active category attribute with this name already exists in the selected category.'
        )
      }
      DuplicateException.throwIf(
        error,
        'An active predefined choice already uses this label or position.',
        CHOICE_DUPLICATE_CONSTRAINTS
      )
    }
  }
}
