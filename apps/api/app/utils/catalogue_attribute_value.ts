import { DateTime } from 'luxon'
import type { CategoryAttributeDataType, ResolvedCatalogueAttributeValue } from '#types/catalogue'

interface AttributeValueInput {
  categoryAttributeId: string
  textValue?: string
  numberValue?: string
  dateValue?: string
  yesNoValue?: boolean
  choiceId?: string
}

function canonicalDecimal(value: string) {
  const [integer, fraction] = value.split('.')
  const resolvedFraction = fraction?.replace(/0+$/, '')
  return resolvedFraction ? `${integer}.${resolvedFraction}` : integer
}

export function resolveCatalogueAttributeValue(
  dataType: CategoryAttributeDataType,
  input: AttributeValueInput
): ResolvedCatalogueAttributeValue {
  const supplied = [
    input.textValue,
    input.numberValue,
    input.dateValue,
    input.yesNoValue,
    input.choiceId,
  ].filter((value) => value !== undefined)
  if (supplied.length !== 1) {
    throw new Error('Exactly one attribute value must be supplied.')
  }

  const empty = {
    categoryAttributeId: input.categoryAttributeId,
    dataType,
    textValue: null,
    numberValue: null,
    dateValue: null,
    yesNoValue: null,
    choiceId: null,
  }

  if (dataType === 'TEXT' && input.textValue !== undefined) {
    return { ...empty, textValue: input.textValue.trim() }
  }
  if (dataType === 'NUMBER' && input.numberValue !== undefined) {
    return { ...empty, numberValue: canonicalDecimal(input.numberValue) }
  }
  if (dataType === 'DATE' && input.dateValue !== undefined) {
    const date = DateTime.fromISO(input.dateValue, { zone: 'utc' })
    if (!date.isValid || date.toISODate() !== input.dateValue) {
      throw new Error('The attribute date must be a real ISO calendar date.')
    }
    return { ...empty, dateValue: input.dateValue }
  }
  if (dataType === 'YES_NO' && input.yesNoValue !== undefined) {
    return { ...empty, yesNoValue: input.yesNoValue }
  }
  if (dataType === 'PREDEFINED_CHOICE' && input.choiceId !== undefined) {
    return { ...empty, choiceId: input.choiceId }
  }
  throw new Error(`The supplied value does not match the ${dataType} attribute type.`)
}
