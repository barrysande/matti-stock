import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import RoleAssignment from '#models/role_assignment'
import OrganizationalScopeService from '#services/organizational_scope_service'
import RoleAssignmentLifecycleService from '#services/role_assignment_lifecycle_service'
import type { indexRoleAssignmentsValidator } from '#validators/role_assignment'
import type { Infer } from '@vinejs/vine/types'

const ASSIGNMENTS_PER_PAGE = 20
type ListData = Infer<typeof indexRoleAssignmentsValidator>

@inject()
export default class RoleAssignmentDirectoryService {
  constructor(
    private assignmentLifecycle: RoleAssignmentLifecycleService,
    private organizationalScopes: OrganizationalScopeService
  ) {}

  private summaryQuery() {
    return RoleAssignment.query()
      .preload('account', (builder) => {
        builder.select('id', 'person_id', 'email', 'status').preload('person', (personBuilder) => {
          personBuilder.select('id', 'display_name')
        })
      })
      .preload('scopeOrgUnit', (builder) => {
        builder.select('id', 'name', 'unit_type', 'archived_at')
      })
      .preload('termination', (builder) => {
        builder.select('id', 'assignment_id', 'kind', 'effective_at')
      })
      .preload('roleVersion', (builder) => {
        builder.select('id', 'role_id', 'version').preload('role', (roleBuilder) => {
          roleBuilder.select('id', 'key', 'name', 'archived_at')
        })
      })
  }

  private detailQuery() {
    return RoleAssignment.query()
      .preload('account', (builder) => {
        builder.preload('person')
      })
      .preload('grantedByAccount', (builder) => {
        builder.preload('person')
      })
      .preload('scopeOrgUnit')
      .preload('termination', (builder) => {
        builder.preload('terminatedByAccount', (accountBuilder) => {
          accountBuilder.preload('person')
        })
      })
      .preload('roleVersion', (builder) => {
        builder.preload('permissions').preload('role', (roleBuilder) => {
          roleBuilder.preload('versions', (versionBuilder) => {
            versionBuilder.orderBy('version', 'desc')
          })
        })
      })
  }

  private async decorateSummary(assignments: RoleAssignment[], now: DateTime) {
    const { unitMap } = await this.organizationalScopes.hierarchy()

    for (const assignment of assignments) {
      const scope = unitMap.get(assignment.scopeOrgUnitId)
      assignment.scopeOrgUnit.$extras.path = scope?.$extras.path ?? assignment.scopeOrgUnit.name
      assignment.$extras.assignmentState = this.assignmentLifecycle.state(assignment, now)
    }

    return assignments
  }

  private async decorateDetail(assignments: RoleAssignment[], now: DateTime) {
    await this.decorateSummary(assignments, now)
    for (const assignment of assignments) {
      assignment.$extras.isLatestRoleVersion =
        assignment.roleVersion.role.versions[0]?.id === assignment.roleVersionId
    }

    return assignments
  }

  /** Prepares already-loaded assignments for the shared safe API projection. */
  prepare(assignments: RoleAssignment[], now: DateTime = DateTime.now()) {
    return this.decorateDetail(assignments, now)
  }

  /** Lists assignment history and current grants using stable pagination and lifecycle filters. */
  async list(data: ListData, now: DateTime = DateTime.now()) {
    const query = this.summaryQuery().orderBy('starts_at', 'desc').orderBy('id', 'asc')

    if (data.accountId) query.where('account_id', data.accountId)
    if (data.scopeOrganizationalUnitId) {
      query.where('scope_org_unit_id', data.scopeOrganizationalUnitId)
    }
    if (data.roleId) {
      query.whereHas('roleVersion', (builder) => {
        builder.where('role_id', data.roleId!)
      })
    }
    if (data.status === 'UPCOMING') {
      query.where('starts_at', '>', now.toJSDate()).whereDoesntHave('termination', (builder) => {
        builder.where('effective_at', '<=', now.toJSDate())
      })
    } else if (data.status === 'ACTIVE') {
      query
        .where('starts_at', '<=', now.toJSDate())
        .where((builder) => {
          builder.whereNull('expires_at').orWhere('expires_at', '>', now.toJSDate())
        })
        .whereDoesntHave('termination', (builder) => {
          builder.where('effective_at', '<=', now.toJSDate())
        })
    } else if (data.status === 'EXPIRED') {
      query.where('expires_at', '<=', now.toJSDate()).whereDoesntHave('termination', (builder) => {
        builder.where('effective_at', '<=', now.toJSDate())
      })
    } else if (data.status) {
      query.whereHas('termination', (builder) => {
        builder.where('kind', data.status!).where('effective_at', '<=', now.toJSDate())
      })
    }

    const assignments = await query.paginate(data.page ?? 1, ASSIGNMENTS_PER_PAGE)
    await this.decorateSummary(assignments.all(), now)
    return assignments
  }

  /** Loads one assignment with its immutable role, scope, grant, and termination context. */
  async findDetails(assignmentId: string, now: DateTime = DateTime.now()) {
    const assignment = await this.detailQuery().where('id', assignmentId).firstOrFail()
    await this.decorateDetail([assignment], now)
    return assignment
  }
}
