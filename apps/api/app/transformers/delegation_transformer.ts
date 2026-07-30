import { BaseTransformer } from '@adonisjs/core/transformers'
import type Delegation from '#models/delegation'
import { roleAssignmentOverview } from '#transformers/role_assignment_transformer'
import type { DelegationState } from '#types/delegation'

function parties(resource: Delegation) {
  return {
    delegator: {
      accountId: resource.delegatorAccountId,
      displayName: resource.delegator.person.displayName,
      email: resource.delegator.email,
    },
    delegate: {
      accountId: resource.delegateAccountId,
      displayName: resource.delegate.person.displayName,
      email: resource.delegate.email,
    },
  }
}

function assignmentSummaries(resource: Delegation) {
  return resource.assignments.map((assignment) => {
    const source = assignment.sourceAssignment
    const sourceState = source.$extras.assignmentState as {
      status: string
      effectiveNow: boolean
    }
    return {
      id: assignment.id,
      sourceAssignmentId: assignment.sourceAssignmentId,
      role: {
        id: source.roleVersion.role.id,
        key: source.roleVersion.role.key,
        name: source.roleVersion.role.name,
        versionId: source.roleVersionId,
        version: Number(source.roleVersion.version),
      },
      scope: {
        organizationalUnitId: source.scopeOrgUnitId,
        name: source.scopeOrgUnit.name,
        unitType: source.scopeOrgUnit.unitType,
        mode: source.scopeMode,
      },
      sourceStatus: sourceState.status,
      sourceEffectiveNow: sourceState.effectiveNow,
      effectiveNow: Boolean(assignment.$extras.effectiveNow),
    }
  })
}

export function delegationSummary(resource: Delegation) {
  const state = resource.$extras.delegationState as DelegationState
  return {
    id: resource.id,
    ...parties(resource),
    assignments: assignmentSummaries(resource),
    startsAt: resource.startsAt,
    expiresAt: resource.expiresAt,
    createdAt: resource.createdAt,
    status: state.status,
    effectiveNow: state.effectiveNow,
    effectiveItemCount: state.effectiveItemCount,
    totalItemCount: state.totalItemCount,
  }
}

export function delegationOverview(resource: Delegation) {
  const summaries = assignmentSummaries(resource)
  return {
    ...delegationSummary(resource),
    assignments: resource.assignments.map((assignment, index) => ({
      ...summaries[index]!,
      source: roleAssignmentOverview(assignment.sourceAssignment),
    })),
    reason: resource.reason,
    response: resource.response
      ? {
          kind: resource.response.kind,
          reason: resource.response.reason,
          respondedBy: {
            accountId: resource.response.respondedByAccountId,
            displayName: resource.response.respondedBy.person.displayName,
          },
          createdAt: resource.response.createdAt,
        }
      : null,
    termination: resource.termination
      ? {
          kind: resource.termination.kind,
          effectiveAt: resource.termination.effectiveAt,
          reason: resource.termination.reason,
          terminatedBy: {
            accountId: resource.termination.terminatedByAccountId,
            displayName: resource.termination.terminatedBy.person.displayName,
          },
          createdAt: resource.termination.createdAt,
        }
      : null,
  }
}

export default class DelegationTransformer extends BaseTransformer<Delegation> {
  toObject() {
    return delegationSummary(this.resource)
  }

  forOverview() {
    return delegationOverview(this.resource)
  }
}
