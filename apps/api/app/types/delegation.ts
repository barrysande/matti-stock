import type { DateTime } from 'luxon'
import type Delegation from '#models/delegation'

export type DelegationResponseKind = 'ACCEPTED' | 'REJECTED'
export type DelegationTerminationKind = 'REVOKED' | 'RELINQUISHED' | 'ADMINISTRATIVELY_TERMINATED'
export type DelegationStatus =
  'PENDING' | 'UPCOMING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | DelegationTerminationKind
export type DelegationDirection = 'INCOMING' | 'OUTGOING'

export interface DelegationState {
  status: DelegationStatus
  effectiveNow: boolean
  effectiveItemCount: number
  totalItemCount: number
}

export interface EffectiveDelegationLink {
  delegation: Delegation
  sourceAssignmentId: string
}

export interface DelegationInterval {
  startsAt: DateTime
  expiresAt: DateTime
}
