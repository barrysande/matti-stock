import { BaseTransformer } from '@adonisjs/core/transformers'
import type Delegation from '#models/delegation'
import type UserAccount from '#models/user_account'
import { delegationSummary } from '#transformers/delegation_transformer'
import { roleAssignmentOverview } from '#transformers/role_assignment_transformer'

export default class AccountTransformer extends BaseTransformer<UserAccount> {
  toObject() {
    return {
      id: this.resource.id,
      email: this.resource.email,
      status: this.resource.status,
      setupStatus: this.resource.person.primaryEmailVerifiedAt ? 'COMPLETE' : 'PENDING',
      lastLoginAt: this.resource.lastLoginAt,
      createdAt: this.resource.createdAt,
      person: {
        id: this.resource.person.id,
        displayName: this.resource.person.displayName,
        staffNumber: this.resource.person.staffNumber,
      },
    }
  }

  forDetailedView() {
    const delegations = this.resource.$extras.delegations as
      { incoming: Delegation[]; outgoing: Delegation[] } | undefined
    return {
      ...this.toObject(),
      roleAssignments: this.resource.roleAssignments.map(roleAssignmentOverview),
      delegations: delegations
        ? {
            incoming: delegations.incoming.map(delegationSummary),
            outgoing: delegations.outgoing.map(delegationSummary),
          }
        : undefined,
    }
  }
}
