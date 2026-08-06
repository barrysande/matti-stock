import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import InvalidCatalogueItemChangeException from '#exceptions/invalid_catalogue_item_change_exception'
import CatalogueItemAttributeValue from '#models/catalogue_item_attribute_value'
import CategoryAttribute from '#models/category_attribute'
import CategoryAttributeChoice from '#models/category_attribute_choice'
import { resolveCatalogueAttributeValue } from '#utils/catalogue_attribute_value'
import type { CategoryAttributeDataType, ResolvedCatalogueAttributeValue } from '#types/catalogue'
import type {
  createCatalogueItemValidator,
  updateCatalogueItemAttributeValuesValidator,
} from '#validators/catalogue_item'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { Infer } from '@vinejs/vine/types'

type CreateValueInput = NonNullable<
  Infer<typeof createCatalogueItemValidator>['attributeValues']
>[number]
type ChangeInput = Infer<typeof updateCatalogueItemAttributeValuesValidator>['changes'][number]

interface PreparedReplacement {
  attributeIds: string[]
  values: ResolvedCatalogueAttributeValue[]
}

@inject()
export default class CatalogueItemAttributeValueService {
  private invalid(message: string): never {
    throw new InvalidCatalogueItemChangeException(message)
  }

  private lockDefinitions(categoryId: string, trx: TransactionClientContract) {
    return CategoryAttribute.query({ client: trx })
      .where('catalogue_category_id', categoryId)
      .where('scope', 'CATALOGUE')
      .whereNull('archived_at')
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private lockCurrentValues(catalogueItemId: string, trx: TransactionClientContract) {
    return CatalogueItemAttributeValue.query({ client: trx })
      .where('catalogue_item_id', catalogueItemId)
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private async lockSelectedChoices(
    values: ResolvedCatalogueAttributeValue[],
    trx: TransactionClientContract
  ) {
    const choiceIds = values
      .map(({ choiceId }) => choiceId)
      .filter((choiceId): choiceId is string => Boolean(choiceId))
      .sort()

    if (!choiceIds.length) {
      return []
    }

    return CategoryAttributeChoice.query({ client: trx })
      .whereIn('id', choiceIds)
      .whereNull('archived_at')
      .orderBy('category_attribute_id', 'asc')
      .orderBy('id', 'asc')
      .forUpdate()
  }

  private resolveValues(attributes: CategoryAttribute[], inputs: CreateValueInput[]) {
    const attributeById = new Map(attributes.map((attribute) => [attribute.id, attribute]))
    const inputIds = inputs.map(({ categoryAttributeId }) => categoryAttributeId)
    if (new Set(inputIds).size !== inputIds.length) {
      this.invalid('Each catalogue attribute may be supplied at most once.')
    }

    for (const inputId of inputIds) {
      if (!attributeById.has(inputId)) {
        this.invalid(
          'Catalogue attribute values must use active catalogue-scoped definitions from the exact category.'
        )
      }
    }

    for (const attribute of attributes) {
      if (attribute.isRequired && !inputIds.includes(attribute.id)) {
        this.invalid(`The required catalogue attribute "${attribute.name}" needs a value.`)
      }
    }

    return inputs.map((input) => {
      try {
        return resolveCatalogueAttributeValue(
          attributeById.get(input.categoryAttributeId)!.dataType as CategoryAttributeDataType,
          input
        )
      } catch (error) {
        this.invalid(
          error instanceof Error ? error.message : 'The catalogue attribute value is invalid.'
        )
      }
    })
  }

  private async validateAndMarkChoices(
    values: ResolvedCatalogueAttributeValue[],
    choices: CategoryAttributeChoice[],
    now: DateTime<true>
  ) {
    const choiceById = new Map(choices.map((choice) => [choice.id, choice]))

    for (const value of values) {
      if (!value.choiceId) {
        continue
      }

      const choice = choiceById.get(value.choiceId)

      if (!choice || choice.categoryAttributeId !== value.categoryAttributeId) {
        this.invalid('The selected predefined choice is unavailable for the catalogue attribute.')
      }

      if (!choice.firstUsedAt) {
        await choice.merge({ firstUsedAt: now }).save()
      }
    }
  }

  private async markDefinitionsUsed(attributes: CategoryAttribute[], now: DateTime<true>) {
    for (const attribute of attributes) {
      if (!attribute.semanticsLockedAt) {
        await attribute.merge({ semanticsLockedAt: now }).save()
      }
    }
  }

  private createCurrentValue(
    catalogueItemId: string,
    value: ResolvedCatalogueAttributeValue,
    trx: TransactionClientContract
  ) {
    return CatalogueItemAttributeValue.create(
      {
        catalogueItemId,
        ...value,
        dateValue: value.dateValue ? DateTime.fromISO(value.dateValue, { zone: 'utc' }) : null,
      },
      { client: trx }
    )
  }

  private sameValue(
    current: CatalogueItemAttributeValue,
    proposed: ResolvedCatalogueAttributeValue
  ) {
    return (
      current.dataType === proposed.dataType &&
      current.textValue === proposed.textValue &&
      (current.numberValue === null ? null : String(current.numberValue)) ===
        proposed.numberValue &&
      (current.dateValue?.toISODate() ?? null) === proposed.dateValue &&
      current.yesNoValue === proposed.yesNoValue &&
      current.choiceId === proposed.choiceId
    )
  }

  async prepareReplacement(
    categoryId: string,
    inputs: CreateValueInput[] = [],
    trx: TransactionClientContract,
    now: DateTime<true>
  ): Promise<PreparedReplacement> {
    const attributes = await this.lockDefinitions(categoryId, trx)

    const values = this.resolveValues(attributes, inputs)

    const choices = await this.lockSelectedChoices(values, trx)

    await this.validateAndMarkChoices(values, choices, now)

    await this.markDefinitionsUsed(attributes, now)

    return { attributeIds: attributes.map(({ id }) => id), values }
  }

  async assertApplicableSetUnchanged(
    categoryId: string,
    expectedIds: string[],
    trx: TransactionClientContract
  ) {
    const current = await CategoryAttribute.query({ client: trx })
      .where('catalogue_category_id', categoryId)
      .where('scope', 'CATALOGUE')
      .whereNull('archived_at')
      .orderBy('id', 'asc')
      .select('id')

    const currentIds = current.map(({ id }) => id)
    if (currentIds.join(':') !== expectedIds.join(':')) {
      this.invalid(
        'Catalogue attributes changed during the request. Review the item and try again.'
      )
    }
  }

  async replaceCurrent(
    catalogueItemId: string,
    values: ResolvedCatalogueAttributeValue[],
    trx: TransactionClientContract
  ) {
    await this.lockCurrentValues(catalogueItemId, trx)
    await CatalogueItemAttributeValue.query({ client: trx })
      .where('catalogue_item_id', catalogueItemId)
      .delete()
    for (const value of values) await this.createCurrentValue(catalogueItemId, value, trx)
  }

  async applyChanges(
    catalogueItemId: string,
    categoryId: string,
    changes: ChangeInput[],
    trx: TransactionClientContract,
    now: DateTime<true>
  ) {
    const attributes = await this.lockDefinitions(categoryId, trx)
    const attributeById = new Map(attributes.map((attribute) => [attribute.id, attribute]))

    const changeIds = changes.map(({ categoryAttributeId }) => categoryAttributeId)
    if (new Set(changeIds).size !== changeIds.length) {
      this.invalid('Each catalogue attribute may be changed at most once.')
    }

    const setInputs = changes.filter(({ operation }) => operation === 'SET')
    const resolved = this.resolveValues(
      attributes.filter((attribute) =>
        setInputs.some((input) => input.categoryAttributeId === attribute.id)
      ),
      setInputs
    )

    const choices = await this.lockSelectedChoices(resolved, trx)

    await this.validateAndMarkChoices(resolved, choices, now)

    const current = await this.lockCurrentValues(catalogueItemId, trx)

    const currentByAttribute = new Map(current.map((value) => [value.categoryAttributeId, value]))

    const resolvedByAttribute = new Map(resolved.map((value) => [value.categoryAttributeId, value]))

    for (const change of changes) {
      const attribute = attributeById.get(change.categoryAttributeId)
      if (!attribute) {
        this.invalid('Only active catalogue-scoped attributes from the exact category may change.')
      }

      const existing = currentByAttribute.get(attribute.id)
      if (change.operation === 'REMOVE') {
        if (
          change.textValue !== undefined ||
          change.numberValue !== undefined ||
          change.dateValue !== undefined ||
          change.yesNoValue !== undefined ||
          change.choiceId !== undefined
        ) {
          this.invalid('A REMOVE operation must not supply a replacement value.')
        }
        if (attribute.isRequired) {
          this.invalid(`The required attribute "${attribute.name}" cannot be removed.`)
        }
        if (!existing) {
          this.invalid(`The optional attribute "${attribute.name}" has no current value.`)
        }

        await existing.delete()
        continue
      }
      const value = resolvedByAttribute.get(attribute.id)!
      if (existing) {
        if (this.sameValue(existing, value)) {
          this.invalid(`The attribute "${attribute.name}" already has this value.`)
        }

        await existing
          .merge({
            ...value,
            dateValue: value.dateValue ? DateTime.fromISO(value.dateValue, { zone: 'utc' }) : null,
          })
          .save()
      } else {
        await this.createCurrentValue(catalogueItemId, value, trx)
      }
    }
    return attributes.map(({ id }) => id)
  }

  async currentValueIds(catalogueItemId: string, trx: TransactionClientContract) {
    const values = await this.lockCurrentValues(catalogueItemId, trx)
    return values.map(({ id }) => id).sort()
  }
}
