import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import type RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import DelegationScopeCompatibilityService from '#services/delegation_scope_compatibility_service'
import OrganizationalScopeService from '#services/organizational_scope_service'
import type { DelegationProposalOptions } from '#types/delegation'
import type { delegationProposalOptionsValidator } from '#validators/delegation'
import type { Infer } from '@vinejs/vine/types'

const CANDIDATES_PER_PAGE = 20
type OptionsData = Infer<typeof delegationProposalOptionsValidator>

@inject()
export default class DelegationProposalOptionsService {
  constructor(
    private compatibility: DelegationScopeCompatibilityService,
    private organizationalScopes: OrganizationalScopeService
  ) {}

  private candidateQuery(candidateIds: string[]) {
    return UserAccount.query()
      .join('people', 'people.id', 'user_accounts.person_id')
      .select('user_accounts.*')
      .whereIn('user_accounts.id', candidateIds)
      .preload('person', (builder) => {
        builder.select('id', 'display_name')
      })
      .orderBy('people.display_name', 'asc')
      .orderBy('user_accounts.id', 'asc')
  }

  /** Returns only recipients and source grants that share a current direct scope branch. */
  async get(data: OptionsData, actorAccountId: string): Promise<DelegationProposalOptions> {
    const now = DateTime.now()
    const sources = await this.compatibility.delegatableSources(actorAccountId, undefined, now)
    const activeAccounts = await UserAccount.query()
      .where('status', 'ACTIVE')
      .whereNot('id', actorAccountId)
      .select('id')

    const compatible = await this.compatibility.compatibleSourcesByCandidate(
      sources,
      activeAccounts.map(({ id }) => id),
      undefined,
      undefined,
      now
    )
    const compatibleByCandidate = new Map<string, RoleAssignment[]>(
      [...compatible].filter(([, assignments]) => assignments.length > 0)
    )

    const candidateIds = [...compatibleByCandidate.keys()]
    const query = this.candidateQuery(candidateIds)
    if (data.search) {
      query.where((builder) => {
        builder
          .whereILike('people.display_name', `%${data.search}%`)
          .orWhereILike('user_accounts.email', `%${data.search}%`)
      })
    }
    const page = await query.paginate(data.page ?? 1, CANDIDATES_PER_PAGE)

    const selectedDelegate =
      data.delegateAccountId && compatibleByCandidate.has(data.delegateAccountId)
        ? await this.candidateQuery([data.delegateAccountId]).first()
        : null
    const sourceAssignments = data.delegateAccountId
      ? (compatibleByCandidate.get(data.delegateAccountId) ?? [])
      : sources
    const { unitMap } = await this.organizationalScopes.hierarchy()
    for (const source of sourceAssignments) {
      source.scopeOrgUnit.$extras.path =
        unitMap.get(source.scopeOrgUnitId)?.$extras.path ?? source.scopeOrgUnit.name
    }

    return {
      candidates: page.all(),
      candidateMetadata: page.getMeta(),
      selectedDelegate,
      sourceAssignments,
    }
  }
}
