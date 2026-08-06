import vine from '@vinejs/vine'
import { CATEGORY_ATTRIBUTE_DATA_TYPES, CATEGORY_ATTRIBUTE_SCOPES } from '#types/catalogue'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const description = () => vine.string().trim().minLength(1).maxLength(5000).nullable().optional()
const reason = () => vine.string().trim().minLength(1)
const choice = vine.object({ label: name() })

export const indexCategoryAttributesValidator = vine.create({
  categoryId: vine.string().uuid().optional(),
  scope: vine.enum(CATEGORY_ATTRIBUTE_SCOPES).optional(),
  dataType: vine.enum(CATEGORY_ATTRIBUTE_DATA_TYPES).optional(),
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
})

export const createCategoryAttributeValidator = vine.create({
  catalogueCategoryId: vine.string().uuid(),
  name: name(),
  description: description(),
  dataType: vine.enum(CATEGORY_ATTRIBUTE_DATA_TYPES),
  isRequired: vine.boolean(),
  scope: vine.enum(CATEGORY_ATTRIBUTE_SCOPES),
  choices: vine.array(choice).minLength(1).optional(),
  reason: reason(),
})

export const updateCategoryAttributeDetailsValidator = vine.create({
  name: name(),
  description: description(),
  reason: reason(),
})

export const updateCategoryAttributeSemanticsValidator = vine.create({
  catalogueCategoryId: vine.string().uuid(),
  dataType: vine.enum(CATEGORY_ATTRIBUTE_DATA_TYPES),
  isRequired: vine.boolean(),
  scope: vine.enum(CATEGORY_ATTRIBUTE_SCOPES),
  choices: vine.array(choice).minLength(1).optional(),
  reason: reason(),
})

export const administerCategoryAttributeValidator = vine.create({
  reason: reason(),
})

export const addCategoryAttributeChoiceValidator = vine.create({
  label: name(),
  reason: reason(),
})

export const updateCategoryAttributeChoiceDetailsValidator = vine.create({
  label: name(),
  reason: reason(),
})

export const reorderCategoryAttributeChoicesValidator = vine.create({
  choiceIds: vine.array(vine.string().uuid()).minLength(1),
  reason: reason(),
})

export const administerCategoryAttributeChoiceValidator = vine.create({
  reason: reason(),
})
