import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const description = () => vine.string().trim().minLength(1).maxLength(5000)
const reason = () => vine.string().trim().minLength(1)

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

export const updateCatalogueCategoryDetailsValidator = vine.create({
  name: name(),
  description: description(),
  reason: reason(),
})

export const reparentCatalogueCategoryValidator = vine.create({
  parentId: vine.string().uuid().nullable(),
  reason: reason(),
})

export const administerCatalogueCategoryValidator = vine.create({
  reason: reason(),
})
