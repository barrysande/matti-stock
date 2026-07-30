import { DateTime } from 'luxon'
import type RoleAssignment from '#models/role_assignment'
import type {
  RoleAssignmentIneffectiveReason,
  RoleAssignmentState,
  RoleAssignmentStatus,
} from '#types/role_assignment'

export default class RoleAssignmentLifecycleService {
  /** Returns the earliest natural expiry or append-only termination for one assignment. */
  effectiveEnd(assignment: RoleAssignment) {
    if (
      assignment.termination &&
      (!assignment.expiresAt || assignment.termination.effectiveAt < assignment.expiresAt)
    ) {
      return assignment.termination.effectiveAt
    }
    return assignment.expiresAt
  }

  /** Determines whether an assignment remains active or upcoming rather than historically closed. */
  isOpen(assignment: RoleAssignment, now: DateTime = DateTime.now()) {
    const endsAt = this.effectiveEnd(assignment)
    return !endsAt || endsAt > now
  }

  /** Derives lifecycle and current-effectiveness state without rewriting assignment history. */
  state(assignment: RoleAssignment, now: DateTime = DateTime.now()): RoleAssignmentState {
    let status: RoleAssignmentStatus

    if (assignment.termination && assignment.termination.effectiveAt <= now) {
      status = assignment.termination.kind as RoleAssignmentStatus
    } else if (assignment.startsAt > now) {
      status = 'UPCOMING'
    } else if (assignment.expiresAt && assignment.expiresAt <= now) {
      status = 'EXPIRED'
    } else {
      status = 'ACTIVE'
    }

    const ineffectiveReasons: RoleAssignmentIneffectiveReason[] = []
    if (assignment.account.status !== 'ACTIVE') ineffectiveReasons.push('ACCOUNT_NOT_ACTIVE')
    if (assignment.roleVersion.role.archivedAt) ineffectiveReasons.push('ROLE_ARCHIVED')
    if (assignment.scopeOrgUnit.archivedAt) ineffectiveReasons.push('SCOPE_ARCHIVED')
    if (status === 'UPCOMING') ineffectiveReasons.push('NOT_STARTED')
    if (status === 'EXPIRED') ineffectiveReasons.push('EXPIRED')
    if (['ENDED', 'CANCELLED', 'REPLACED'].includes(status)) {
      ineffectiveReasons.push('TERMINATED')
    }

    return {
      status,
      effectiveNow: status === 'ACTIVE' && ineffectiveReasons.length === 0,
      ineffectiveReasons,
    }
  }
}
