import { BaseTransformer } from '@adonisjs/core/transformers'
import type UserAccount from '#models/user_account'
import RoleAssignmentTransformer from '#transformers/role_assignment_transformer'

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

  forOverview() {
    return {
      ...this.toObject(),
      roleAssignments: RoleAssignmentTransformer.transform(
        this.whenLoaded(this.resource.roleAssignments)
      ),
    }
  }
}
