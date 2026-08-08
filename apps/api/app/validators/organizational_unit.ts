import vine from '@vinejs/vine'

const name = () => vine.string().trim().minLength(1).maxLength(255)
const reason = () => vine.string().trim().minLength(1)
const impactFingerprint = () =>
  vine
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/)

export const indexOrganizationalUnitsValidator = vine.create({
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  unitType: vine.enum(['INSTITUTE', 'DEPARTMENT', 'SUB_DEPARTMENT'] as const).optional(),
  includeArchived: vine.boolean().optional(),
})

export const organizationalUnitHistoryValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
})

export const createOrganizationalUnitValidator = vine.create({
  name: name(),
  unitType: vine.enum(['DEPARTMENT', 'SUB_DEPARTMENT'] as const),
  parentId: vine.string().uuid(),
  reason: reason(),
  impactFingerprint: impactFingerprint(),
})

export const previewOrganizationalAccessImpactValidator = vine.create({
  operation: vine.enum(['CREATE_CHILD', 'REPARENT', 'ARCHIVE', 'RESTORE'] as const),
  parentId: vine.string().uuid().optional(),
  childUnitType: vine.enum(['DEPARTMENT', 'SUB_DEPARTMENT'] as const).optional(),
})

export const renameOrganizationalUnitValidator = vine.create({
  name: name(),
  reason: reason(),
})

export const reparentOrganizationalUnitValidator = vine.create({
  parentId: vine.string().uuid(),
  reason: reason(),
  impactFingerprint: impactFingerprint(),
})

export const administerOrganizationalUnitValidator = vine.create({
  reason: reason(),
  impactFingerprint: impactFingerprint(),
})
