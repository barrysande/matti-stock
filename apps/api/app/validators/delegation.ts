import vine from '@vinejs/vine'

const reason = () => vine.string().trim().minLength(1)
const delegationDate = () => vine.date({ formats: ['iso8601'] })

export const indexDelegationsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  accountId: vine.string().uuid().optional(),
  direction: vine.enum(['INCOMING', 'OUTGOING'] as const).optional(),
  status: vine
    .enum([
      'PENDING',
      'UPCOMING',
      'ACTIVE',
      'REJECTED',
      'EXPIRED',
      'REVOKED',
      'RELINQUISHED',
      'ADMINISTRATIVELY_TERMINATED',
    ] as const)
    .optional(),
})

export const delegationProposalOptionsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  search: vine.string().trim().minLength(1).maxLength(255).optional(),
  delegateAccountId: vine.string().uuid().optional(),
})

export const createDelegationValidator = vine.create({
  delegateAccountId: vine.string().uuid(),
  assignmentIds: vine.array(vine.string().uuid()).minLength(1),
  startMode: vine.enum(['NOW', 'SCHEDULED'] as const),
  startsAt: delegationDate().optional(),
  expiresAt: delegationDate(),
  reason: reason(),
})

export const acceptDelegationValidator = vine.create({
  reason: reason().optional(),
})

export const rejectDelegationValidator = vine.create({
  reason: reason(),
})

export const terminateDelegationValidator = vine.create({
  reason: reason(),
})
