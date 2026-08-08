import vine from '@vinejs/vine'
import { BASE_UNIT_KINDS } from '#types/catalogue'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const symbol = () => vine.string().trim().minLength(1).maxLength(32)
const reason = () => vine.string().trim().minLength(1)
const details = () => ({
  name: name(),
  symbol: symbol(),
  kind: vine.enum(BASE_UNIT_KINDS),
  precision: vine.number().withoutDecimals().min(0).max(3).optional(),
  reason: reason(),
})

export const indexBaseUnitsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
  kind: vine.enum(BASE_UNIT_KINDS).optional(),
})

export const baseUnitOptionsValidator = vine.create({
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
  kind: vine.enum(BASE_UNIT_KINDS).optional(),
})

export const baseUnitHistoryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
})

export const createBaseUnitValidator = vine.create(details())

export const updateBaseUnitDetailsValidator = vine.create(details())

export const administerBaseUnitValidator = vine.create({
  reason: reason(),
})
