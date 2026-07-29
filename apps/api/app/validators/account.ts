import vine from '@vinejs/vine'

const reason = () => vine.string().trim().minLength(1)

export const indexAccountsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  status: vine.enum(['INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const).optional(),
  setupStatus: vine.enum(['PENDING', 'COMPLETE'] as const).optional(),
})

export const createAccountValidator = vine.create({
  displayName: vine.string().trim().minLength(1).maxLength(255),
  staffNumber: vine.string().trim().minLength(1).maxLength(100).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).toLowerCase(),
  reason: reason(),
})

export const administerAccountValidator = vine.create({
  reason: reason(),
})
