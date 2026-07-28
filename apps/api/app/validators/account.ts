import vine from '@vinejs/vine'

const reason = () => vine.string().trim().minLength(1)

export const createAccountValidator = vine.create({
  displayName: vine.string().trim().minLength(1).maxLength(255),
  staffNumber: vine.string().trim().minLength(1).maxLength(100).nullable().optional(),
  email: vine.string().trim().email().maxLength(254).toLowerCase(),
  reason: reason(),
})

export const administerAccountValidator = vine.create({
  reason: reason(),
})
