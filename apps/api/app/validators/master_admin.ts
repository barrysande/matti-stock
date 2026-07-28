import vine from '@vinejs/vine'

export const masterAdminBootstrapValidator = vine.create({
  instituteName: vine.string().trim().minLength(1).maxLength(255),
  masterName: vine.string().trim().minLength(1).maxLength(255),
  masterEmail: vine.string().trim().email().maxLength(254).toLowerCase(),
})
