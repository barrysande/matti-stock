import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const reason = () => vine.string().trim().minLength(1)

export const indexPhysicalLocationsValidator = vine.create({
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
})

export const physicalLocationHistoryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
})

export const createPhysicalLocationValidator = vine.create({
  name: name(),
  parentId: vine.string().uuid().optional(),
  reason: reason(),
})

export const renamePhysicalLocationValidator = vine.create({
  name: name(),
  reason: reason(),
})

export const reparentPhysicalLocationValidator = vine.create({
  parentId: vine.string().uuid().nullable(),
  reason: reason(),
})

export const administerPhysicalLocationValidator = vine.create({
  reason: reason(),
})
