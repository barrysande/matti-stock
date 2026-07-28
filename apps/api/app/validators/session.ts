import vine from '@vinejs/vine'

const password = () => vine.string().minLength(8).maxLength(25)

export const loginValidator = vine.create({
  email: vine.string().trim().email().maxLength(254).toLowerCase(),
  password: vine.string().minLength(1).maxLength(25),
})

export const forgotPasswordValidator = vine.create({
  email: vine.string().trim().email().maxLength(254).toLowerCase(),
})

export const resetPasswordValidator = vine.create({
  token: vine.string().trim().minLength(1),
  password: password(),
})

export const changePasswordValidator = vine.create({
  currentPassword: vine.string().minLength(1).maxLength(25),
  password: password(),
})
