import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import UserAccount from '#models/user_account'
import EffectiveAccessService from '#services/effective_access_service'
import RoleAssignmentDirectoryService from '#services/role_assignment_directory_service'
import type { indexAccountsValidator } from '#validators/account'
import type { Infer } from '@vinejs/vine/types'

const ACCOUNTS_PER_PAGE = 20

type ListData = Infer<typeof indexAccountsValidator>

@inject()
export default class AccountDirectoryService {
  constructor(
    private effectiveAccess: EffectiveAccessService,
    private roleAssignments: RoleAssignmentDirectoryService
  ) {}

  /** Lists safe account-directory records with stable pagination and administrative filters. */
  list(data: ListData) {
    const query = UserAccount.query()
      .join('people', 'people.id', 'user_accounts.person_id')
      .select('user_accounts.*')
      .preload('person')
      .orderBy('people.display_name', 'asc')
      .orderBy('user_accounts.id', 'asc')

    if (data.search) {
      query.where((builder) => {
        builder
          .whereILike('people.display_name', `%${data.search}%`)
          .orWhereILike('user_accounts.email', `%${data.search}%`)
          .orWhereILike('people.staff_number', `%${data.search}%`)
      })
    }

    if (data.status) {
      query.where('user_accounts.status', data.status)
    }

    if (data.setupStatus === 'PENDING') {
      query.whereNull('people.primary_email_verified_at')
    } else if (data.setupStatus === 'COMPLETE') {
      query.whereNotNull('people.primary_email_verified_at')
    }

    return query.paginate(data.page ?? 1, ACCOUNTS_PER_PAGE)
  }

  /** Loads one account with its active and upcoming assignment access overview. */
  async overview(accountId: string, now: DateTime = DateTime.now()) {
    const account = await UserAccount.query()
      .where('id', accountId)
      .preload('person')
      .preload('roleAssignments', (assignmentQuery) => {
        assignmentQuery
          .preload('account', (accountQuery) => {
            accountQuery.preload('person')
          })
          .preload('roleVersion', (versionQuery) => {
            versionQuery.preload('permissions').preload('role', (roleQuery) => {
              roleQuery.preload('versions', (versionsQuery) => {
                versionsQuery.orderBy('version', 'desc')
              })
            })
          })
          .preload('scopeOrgUnit')
          .preload('grantedByAccount', (accountQuery) => {
            accountQuery.preload('person')
          })
          .preload('termination', (terminationQuery) => {
            terminationQuery.preload('terminatedByAccount', (accountQuery) => {
              accountQuery.preload('person')
            })
          })
          .orderBy('starts_at', 'desc')
          .orderBy('id', 'asc')
      })
      .firstOrFail()

    const openAssignments = account.roleAssignments.filter((assignment) =>
      this.effectiveAccess.isOpen(assignment, now)
    )
    account.roleAssignments.splice(0, account.roleAssignments.length, ...openAssignments)
    await this.roleAssignments.prepare(openAssignments, now)
    return account
  }
}
