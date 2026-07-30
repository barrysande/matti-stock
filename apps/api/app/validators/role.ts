import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const reason = () => vine.string().trim().minLength(1)
const permissionKeys = () =>
  vine.array(vine.string().trim().minLength(1).maxLength(100)).minLength(1)

export const indexRolesValidator = vine.create({
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  includeArchived: vine.boolean().optional(),
  systemManaged: vine.boolean().optional(),
})

export const createRoleValidator = vine.create({
  name: name(),
  permissionKeys: permissionKeys(),
  reason: reason(),
})

export const renameRoleValidator = vine.create({
  name: name(),
  reason: reason(),
})

export const replaceRolePermissionsValidator = vine.create({
  permissionKeys: permissionKeys(),
  reason: reason(),
})

export const administerRoleValidator = vine.create({
  reason: reason(),
})
