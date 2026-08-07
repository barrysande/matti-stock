import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const description = () => vine.string().trim().minLength(1).maxLength(5000)
const reason = () => vine.string().trim().minLength(1)
const fingerprint = () =>
  vine
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/)

export const indexCatalogueCategoriesValidator = vine.create({
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
})

export const createCatalogueCategoryValidator = vine.create({
  name: name(),
  description: description(),
  parentId: vine.string().uuid().optional(),
  reason: reason(),
})

export const reviewCatalogueCategoryCreationValidator = vine.create({
  name: name(),
  parentId: vine.string().uuid().optional(),
})

export const updateCatalogueCategoryDetailsValidator = vine.create({
  name: name(),
  description: description(),
  reason: reason(),
})

export const reparentCatalogueCategoryValidator = vine.create({
  parentId: vine.string().uuid().nullable(),
  reason: reason(),
})

export const previewCatalogueCategoryMergeValidator = vine.create({
  targetCategoryId: vine.string().uuid(),
})

export const mergeCatalogueCategoryValidator = vine.create({
  targetCategoryId: vine.string().uuid(),
  previewFingerprint: fingerprint(),
  reason: reason(),
})

export const administerCatalogueCategoryValidator = vine.create({
  reason: reason(),
})
