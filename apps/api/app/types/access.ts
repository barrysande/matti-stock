export type AccountStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'

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

export interface PasswordResetToken {
  challengeId: string
  resetVersion: number
}
