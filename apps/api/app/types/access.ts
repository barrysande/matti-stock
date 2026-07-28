export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'
export type PasswordChallengePurpose = 'INITIAL_SETUP' | 'RESET'

export interface RequestAuditContext {
  ip?: string
  requestId?: string
}

export interface RecordAccessEvent {
  eventType: string
  actorType: 'SYSTEM' | 'ACCOUNT'
  actorAccountId?: string
  targetType: string
  targetId?: string
  reason?: string
  identifierFingerprint?: string
  request?: RequestAuditContext
  metadata?: Record<string, unknown>
}

export interface PasswordCredentialToken {
  challengeId: string
  purpose: PasswordChallengePurpose
  resetVersion: number
}
