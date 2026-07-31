export const ACCOUNT_ACCESS_EVENT_CATEGORIES = [
  'ACCOUNT',
  'AUTHENTICATION',
  'CREDENTIAL',
  'ROLE_ASSIGNMENT',
  'DELEGATION',
  'OTHER',
] as const

export type AccountAccessEventCategory = (typeof ACCOUNT_ACCESS_EVENT_CATEGORIES)[number]

const EVENT_TYPES_BY_CATEGORY: Record<
  Exclude<AccountAccessEventCategory, 'OTHER'>,
  readonly string[]
> = {
  ACCOUNT: [
    'MASTER_ADMIN_BOOTSTRAPPED',
    'ACCOUNT_CREATED',
    'ACCOUNT_ACTIVATED',
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_SUSPENSION_ENDED',
    'ACCOUNT_DEACTIVATED',
    'ACCOUNT_REACTIVATED',
  ],
  AUTHENTICATION: [
    'LOGIN_SUCCEEDED',
    'LOGIN_REJECTED_ACCOUNT_STATUS',
    'LOGOUT_COMPLETED',
    'SESSION_INVALIDATED',
  ],
  CREDENTIAL: [
    'PASSWORD_SETUP_REQUESTED',
    'PASSWORD_RESET_REQUESTED',
    'PASSWORD_RESET_REJECTED_ACCOUNT_STATUS',
    'PASSWORD_SETUP_REJECTED',
    'PASSWORD_RESET_REJECTED',
    'ACCOUNT_PASSWORD_SET',
    'PASSWORD_RESET_COMPLETED',
    'PASSWORD_CHANGE_REJECTED',
    'PASSWORD_CHANGED',
  ],
  ROLE_ASSIGNMENT: [
    'ROLE_ASSIGNMENT_GRANTED',
    'ROLE_ASSIGNMENT_ENDED',
    'ROLE_ASSIGNMENT_CANCELLED',
    'ROLE_ASSIGNMENT_REPLACED',
  ],
  DELEGATION: [
    'DELEGATION_PROPOSED',
    'DELEGATION_ACCEPTED',
    'DELEGATION_REJECTED',
    'DELEGATION_REVOKED',
    'DELEGATION_RELINQUISHED',
    'DELEGATION_ADMINISTRATIVELY_TERMINATED',
  ],
}

export const KNOWN_ACCOUNT_ACCESS_EVENT_TYPES = Object.values(EVENT_TYPES_BY_CATEGORY).flat()

export function accountAccessEventCategory(eventType: string): AccountAccessEventCategory {
  for (const [category, eventTypes] of Object.entries(EVENT_TYPES_BY_CATEGORY)) {
    if (eventTypes.includes(eventType)) {
      return category as AccountAccessEventCategory
    }
  }
  return 'OTHER'
}

export function accountAccessEventTypesForCategory(category: AccountAccessEventCategory) {
  return category === 'OTHER' ? null : EVENT_TYPES_BY_CATEGORY[category]
}

interface TimelineAccount {
  accountId: string
  personId: string
  displayName: string
}

interface RoleAssignmentTimelineTarget {
  kind: 'ROLE_ASSIGNMENT'
  role: {
    id: string
    key: string
    name: string
    versionId: string
    version: number
  }
  scope: {
    organizationalUnitId: string
    name: string
    unitType: string
    mode: string
  }
  startsAt: string | null
  expiresAt: string | null
}

interface DelegationTimelineTarget {
  kind: 'DELEGATION'
  delegator: TimelineAccount
  delegate: TimelineAccount
  startsAt: string | null
  expiresAt: string | null
}

export type AccountAccessEventTargetContext =
  RoleAssignmentTimelineTarget | DelegationTimelineTarget
