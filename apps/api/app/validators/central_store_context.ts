import vine from '@vinejs/vine'

export const centralStoreContextHistoryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
})

export const configureCentralStoreContextValidator = vine.create({
  custodialOrganizationalUnitId: vine.string().uuid(),
  physicalLocationId: vine.string().uuid(),
  reason: vine.string().trim().minLength(1),
})
