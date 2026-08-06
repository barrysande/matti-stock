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
import { normalizeCategoryAttributeChoiceLabel } from '#utils/category_attribute'
import type { updateCategoryAttributeSemanticsValidator } from '#validators/category_attribute'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const ATTRIBUTE_DUPLICATE_CONSTRAINTS = ['category_attributes_active_category_name_unique'] as const
const CHOICE_DUPLICATE_CONSTRAINTS = [
  'category_attribute_choices_active_label_unique',
  'category_attribute_choices_active_order_unique',
] as const

type SemanticsData = Infer<typeof updateCategoryAttributeSemanticsValidator>

@inject()
export default class CategoryAttributeSemanticAdministrationService {
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

  private normalizeTransitionChoices(data: SemanticsData, currentType: string) {
    if (data.dataType !== 'PREDEFINED_CHOICE') {
      if (data.choices)
        this.invalid('Choices may only be supplied for a predefined-choice attribute.')
      return []
    }
    if (currentType === 'PREDEFINED_CHOICE') {
      if (data.choices)
        this.invalid('Use the choice administration routes to change existing choices.')
      return []
    }
    if (!data.choices?.length) {
      this.invalid('Changing to predefined choice requires at least one active choice.')
    }

    const labels = data.choices.map((choice) => normalizeCategoryAttributeChoiceLabel(choice.label))
    const keys = labels.map((label) => label.toLowerCase())
    if (new Set(keys).size !== keys.length) {
      this.invalidChoice('Predefined-choice labels must be unique within the attribute.')
    }
    return labels
  }

  async update(attributeId: string, data: SemanticsData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)
        const attribute = await this.lockAttribute(trx, attributeId)
        if (attribute.archivedAt) {
          this.invalid('An archived category attribute must be restored before it can be changed.')
        }
        if (attribute.semanticsLockedAt) {
          this.invalid(
            'The attribute category, type, requiredness, and scope require a controlled migration after use.'
          )
        }
        await this.assertActiveCategory(trx, data.catalogueCategoryId)
        const labels = this.normalizeTransitionChoices(data, attribute.dataType)

        if (
          attribute.catalogueCategoryId === data.catalogueCategoryId &&
          attribute.dataType === data.dataType &&
          attribute.isRequired === data.isRequired &&
          attribute.scope === data.scope
        ) {
          this.invalid('The category attribute already has these semantics.')
        }

        const choices = await this.lockChoices(trx, attribute.id)
        if (attribute.dataType === 'PREDEFINED_CHOICE' && data.dataType !== 'PREDEFINED_CHOICE') {
          if (choices.some((choice) => choice.firstUsedAt)) {
            this.invalid(
              'A predefined-choice attribute with used choices requires a controlled migration.'
            )
          }
          for (const choice of choices.filter((candidate) => !candidate.archivedAt)) {
            await choice.merge({ displayOrder: null, archivedAt: now }).save()
            await this.choiceHistory.appendVersion(
              choice,
              'ARCHIVED',
              data.reason,
              actorAccountId,
              authorization,
              trx,
              now
            )
          }
        }

        await attribute
          .merge({
            catalogueCategoryId: data.catalogueCategoryId,
            dataType: data.dataType,
            isRequired: data.isRequired,
            scope: data.scope,
          })
          .save()

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

        await this.attributeHistory.appendVersion(
          attribute,
          'SEMANTICS_UPDATED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )
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
