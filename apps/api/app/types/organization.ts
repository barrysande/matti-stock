import type { DateTime } from 'luxon'

export type OrganizationalUnitType = 'INSTITUTE' | 'DEPARTMENT' | 'SUB_DEPARTMENT'

export type OrganizationalImpactOperation = 'CREATE_CHILD' | 'REPARENT' | 'ARCHIVE' | 'RESTORE'

export interface OrganizationalImpactRequest {
  operation: OrganizationalImpactOperation
  targetUnitId: string
  parentId?: string
  childUnitType?: Exclude<OrganizationalUnitType, 'INSTITUTE'>
}

export interface OrganizationalAccessImpactAssignment {
  id: string
  account: {
    id: string
    displayName: string
    status: string
  }
  role: {
    id: string
    key: string
    name: string
    version: number
  }
  scope: {
    organizationalUnitId: string
    name: string
    mode: string
  }
  startsAt: DateTime
  expiresAt: DateTime | null
}

export interface OrganizationalAccessImpact {
  operation: OrganizationalImpactOperation
  fingerprint: string
  assignments: OrganizationalAccessImpactAssignment[]
}
