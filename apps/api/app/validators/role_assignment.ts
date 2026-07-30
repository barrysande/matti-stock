import vine from '@vinejs/vine'

const reason = () => vine.string().trim().minLength(1)
const assignmentStatus = [
  'UPCOMING',
  'ACTIVE',
  'EXPIRED',
  'ENDED',
  'CANCELLED',
  'REPLACED',
] as const
const assignmentDate = () => vine.date({ formats: ['iso8601'] })

const grant = () => ({
  accountId: vine.string().uuid(),
  roleId: vine.string().uuid(),
  scopeOrganizationalUnitId: vine.string().uuid(),
  scopeMode: vine.enum(['THIS_NODE_ONLY', 'INCLUDE_DESCENDANTS'] as const),
  startMode: vine.enum(['NOW', 'SCHEDULED'] as const),
  startsAt: assignmentDate().optional(),
  expiresAt: assignmentDate().nullable().optional(),
  reason: reason(),
})

export const indexRoleAssignmentsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  accountId: vine.string().uuid().optional(),
  roleId: vine.string().uuid().optional(),
  scopeOrganizationalUnitId: vine.string().uuid().optional(),
  status: vine.enum(assignmentStatus).optional(),
})

export const createRoleAssignmentValidator = vine.create(grant())

export const administerRoleAssignmentValidator = vine.create({
  reason: reason(),
})

export const replaceRoleAssignmentValidator = vine.create(grant())
