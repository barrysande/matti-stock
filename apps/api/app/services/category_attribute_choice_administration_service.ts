import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import InvalidCategoryAttributeChoiceChangeException from '#exceptions/invalid_category_attribute_choice_change_exception'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import CatalogueAuthorityService from '#services/catalogue_authority_service'
import CategoryAttributeChoiceHistoryService from '#services/category_attribute_choice_history_service'
import { normalizeCategoryAttributeChoiceLabel } from '#utils/category_attribute'
import type {
  addCategoryAttributeChoiceValidator,
  administerCategoryAttributeChoiceValidator,
  reorderCategoryAttributeChoicesValidator,
  updateCategoryAttributeChoiceDetailsValidator,
} from '#validators/category_attribute'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

const DUPLICATE_CONSTRAINTS = [
  'category_attribute_choices_active_label_unique',
  'category_attribute_choices_active_order_unique',
] as const

type AddData = Infer<typeof addCategoryAttributeChoiceValidator>
type DetailsData = Infer<typeof updateCategoryAttributeChoiceDetailsValidator>
type ReorderData = Infer<typeof reorderCategoryAttributeChoicesValidator>
type AdministerData = Infer<typeof administerCategoryAttributeChoiceValidator>

@inject()
export default class CategoryAttributeChoiceAdministrationService {
  constructor(
    private authority: CatalogueAuthorityService,
    private history: CategoryAttributeChoiceHistoryService
  ) {}

  private invalid(message: string): never {
    throw new InvalidCategoryAttributeChoiceChangeException(message)
  }

  private async lockAttribute(trx: TransactionClientContract, attributeId: string) {
    const attribute = await CategoryAttribute.query({ client: trx })
      .where('id', attributeId)
      .forUpdate()
      .firstOrFail()

    if (attribute.archivedAt) {
      this.invalid('An archived category attribute must be restored before its choices can change.')
    }

    if (attribute.dataType !== 'PREDEFINED_CHOICE') {
      this.invalid('Only a predefined-choice attribute may own choices.')
    }

    return attribute
  }

  private lockChoices(trx: TransactionClientContract, attributeId: string) {
    return CategoryAttributeChoice.query({ client: trx })
      .where('category_attribute_id', attributeId)
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private choiceFrom(choices: CategoryAttributeChoice[], choiceId: string) {
    const choice = choices.find((candidate) => candidate.id === choiceId)

    if (!choice) this.invalid('The choice does not belong to the selected category attribute.')

    return choice
  }

  private duplicate(error: unknown): never {
    DuplicateException.throwIf(
      error,
      'An active predefined choice already uses this label or position.',
      DUPLICATE_CONSTRAINTS
    )
  }

  async add(attributeId: string, data: AddData, actorAccountId: string) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        await this.lockAttribute(trx, attributeId)
        const choices = await this.lockChoices(trx, attributeId)
        const displayOrder = Math.max(0, ...choices.map((choice) => choice.displayOrder ?? 0)) + 1
        const choice = await CategoryAttributeChoice.create(
          {
            categoryAttributeId: attributeId,
            label: normalizeCategoryAttributeChoiceLabel(data.label),
            displayOrder,
            firstUsedAt: null,
            archivedAt: null,
          },
          { client: trx }
        )

        await this.history.createInitialVersion(
          choice,
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return choice
      })
    } catch (error) {
      this.duplicate(error)
    }
  }

  async updateDetails(
    attributeId: string,
    choiceId: string,
    data: DetailsData,
    actorAccountId: string
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        await this.lockAttribute(trx, attributeId)
        const choice = this.choiceFrom(await this.lockChoices(trx, attributeId), choiceId)

        if (choice.archivedAt)
          this.invalid('An archived choice must be restored before it can change.')
        if (choice.firstUsedAt) this.invalid('A used choice label requires a controlled migration.')
        const label = normalizeCategoryAttributeChoiceLabel(data.label)

        if (choice.label === label) this.invalid('The predefined choice already has this label.')

        await choice.merge({ label }).save()
        await this.history.appendVersion(
          choice,
          'LABEL_UPDATED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return choice
      })
    } catch (error) {
      this.duplicate(error)
    }
  }

  async reorder(attributeId: string, data: ReorderData, actorAccountId: string) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      await this.lockAttribute(trx, attributeId)
      const choices = await this.lockChoices(trx, attributeId)
      const active = choices.filter((choice) => !choice.archivedAt)
      const submitted = new Set(data.choiceIds)

      if (
        submitted.size !== data.choiceIds.length ||
        active.length !== data.choiceIds.length ||
        active.some((choice) => !submitted.has(choice.id))
      ) {
        this.invalid('Reordering requires every active choice exactly once.')
      }

      const alreadyOrdered = active
        .slice()
        .sort((left, right) => Number(left.displayOrder) - Number(right.displayOrder))
        .every((choice, index) => choice.id === data.choiceIds[index])

      if (alreadyOrdered) this.invalid('The predefined choices already use this order.')

      const offset =
        Math.max(0, ...active.map((choice) => Number(choice.displayOrder))) + active.length

      for (const choice of active) {
        await choice.merge({ displayOrder: Number(choice.displayOrder) + offset }).save()
      }

      for (const [index, choiceId] of data.choiceIds.entries()) {
        const choice = this.choiceFrom(active, choiceId)

        await choice.merge({ displayOrder: index + 1 }).save()
        await this.history.appendVersion(
          choice,
          'REORDERED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )
      }

      return active
    })
  }

  async archive(
    attributeId: string,
    choiceId: string,
    data: AdministerData,
    actorAccountId: string
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

      await this.lockAttribute(trx, attributeId)
      const choices = await this.lockChoices(trx, attributeId)
      const choice = this.choiceFrom(choices, choiceId)

      if (choice.archivedAt) this.invalid('The predefined choice is already archived.')
      if (choice.firstUsedAt)
        this.invalid('A used predefined choice requires a controlled migration.')

      if (choices.filter((candidate) => !candidate.archivedAt).length === 1) {
        this.invalid('An active predefined-choice attribute requires at least one active choice.')
      }

      await choice.merge({ displayOrder: null, archivedAt: now }).save()
      await this.history.appendVersion(
        choice,
        'ARCHIVED',
        data.reason,
        actorAccountId,
        authorization,
        trx,
        now
      )

      return choice
    })
  }

  async restore(
    attributeId: string,
    choiceId: string,
    data: AdministerData,
    actorAccountId: string
  ) {
    try {
      return await db.transaction(async (trx) => {
        const now = DateTime.now()
        const authorization = await this.authority.authorizeMutation(trx, actorAccountId, now)

        await this.lockAttribute(trx, attributeId)
        const choices = await this.lockChoices(trx, attributeId)
        const choice = this.choiceFrom(choices, choiceId)

        if (!choice.archivedAt) this.invalid('The predefined choice is not archived.')
        const displayOrder =
          Math.max(0, ...choices.map((candidate) => candidate.displayOrder ?? 0)) + 1

        await choice.merge({ displayOrder, archivedAt: null }).save()
        await this.history.appendVersion(
          choice,
          'RESTORED',
          data.reason,
          actorAccountId,
          authorization,
          trx,
          now
        )

        return choice
      })
    } catch (error) {
      this.duplicate(error)
    }
  }
}
