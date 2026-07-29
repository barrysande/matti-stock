import { DateTime } from 'luxon'
import UserAccount from '#models/user_account'
import type { indexAccountsValidator } from '#validators/account'
import type { Infer } from '@vinejs/vine/types'

const ACCOUNTS_PER_PAGE = 20

type ListData = Infer<typeof indexAccountsValidator>

export default class AccountDirectoryService {
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

  overview(accountId: string, now: DateTime = DateTime.now()) {
    return UserAccount.query()
      .where('id', accountId)
      .preload('person')
      .preload('roleAssignments', (assignmentQuery) => {
        assignmentQuery
          .where('starts_at', '<=', now.toJSDate())
          .where((expiresQuery) => {
            expiresQuery.whereNull('expires_at').orWhere('expires_at', '>', now.toJSDate())
          })
          .whereHas('roleVersion', (versionQuery) => {
            versionQuery.whereHas('role', (roleQuery) => {
              roleQuery.whereNull('archived_at')
            })
          })
          .whereHas('scopeOrgUnit', (scopeQuery) => {
            scopeQuery.whereNull('archived_at')
          })
          .preload('roleVersion', (versionQuery) => {
            versionQuery.preload('role')
          })
          .preload('scopeOrgUnit')
          .orderBy('starts_at', 'desc')
          .orderBy('id', 'asc')
      })
      .firstOrFail()
  }
}
