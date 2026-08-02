import { BaseTransformer } from '@adonisjs/core/transformers'
import type { DelegationProposalOptions } from '#types/delegation'

function candidate(account: DelegationProposalOptions['candidates'][number]) {
  return {
    accountId: account.id,
    displayName: account.person.displayName,
    email: account.email,
  }
}

function sourceAssignment(assignment: DelegationProposalOptions['sourceAssignments'][number]) {
  return {
    id: assignment.id,
    role: {
      id: assignment.roleVersion.role.id,
      key: assignment.roleVersion.role.key,
      name: assignment.roleVersion.role.name,
      versionId: assignment.roleVersion.id,
      version: Number(assignment.roleVersion.version),
      permissionKeys: assignment.roleVersion.permissions.map(({ permissionKey }) => permissionKey),
    },
    scope: {
      organizationalUnitId: assignment.scopeOrgUnit.id,
      name: assignment.scopeOrgUnit.name,
      path: String(assignment.scopeOrgUnit.$extras.path),
      unitType: assignment.scopeOrgUnit.unitType,
      mode: assignment.scopeMode,
    },
    startsAt: assignment.startsAt,
    expiresAt: assignment.expiresAt,
  }
}

export default class DelegationProposalOptionsTransformer extends BaseTransformer<DelegationProposalOptions> {
  toObject() {
    return {
      candidates: {
        data: this.resource.candidates.map(candidate),
        metadata: this.resource.candidateMetadata,
      },
      selectedDelegate: this.resource.selectedDelegate
        ? candidate(this.resource.selectedDelegate)
        : null,
      sourceAssignments: this.resource.sourceAssignments.map(sourceAssignment),
    }
  }
}
