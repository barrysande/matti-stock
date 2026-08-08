import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import CentralStoreAuthorityChangedException from '#exceptions/central_store_authority_changed_exception'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import PhysicalLocation from '#models/physical_location'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import CentralStoreContextDirectoryService from '#services/central_store_context_directory_service'
import EffectiveAccessService from '#services/effective_access_service'
import type { CentralStoreIntakeAuthorization } from '#types/central_store'
import type { EffectiveAccessGrant } from '#types/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class CentralStoreAuthorityService {
  constructor(
    private contexts: CentralStoreContextDirectoryService,
    private effectiveAccess: EffectiveAccessService
  ) {}

  private sameGrant(left: EffectiveAccessGrant, right: EffectiveAccessGrant) {
    return (
      left.assignmentId === right.assignmentId &&
      left.delegationId === right.delegationId &&
      left.permissionKey === right.permissionKey &&
      left.resolvedScopeOrganizationalUnitId === right.resolvedScopeOrganizationalUnitId
    )
  }

  private lockActor(trx: TransactionClientContract, accountId: string) {
    return UserAccount.query({ client: trx }).where('id', accountId).forUpdate().firstOrFail()
  }

  private async lockGrant(trx: TransactionClientContract, grant: EffectiveAccessGrant) {
    await RoleAssignment.query({ client: trx })
      .where('id', grant.assignmentId)
      .forUpdate()
      .firstOrFail()
    await Role.query({ client: trx }).where('id', grant.roleId).forUpdate().firstOrFail()

    if (grant.delegationId) {
      await Delegation.query({ client: trx })
        .where('id', grant.delegationId)
        .forUpdate()
        .firstOrFail()
    }
  }

  /** Checks current intake authority at the configured custodial organizational unit. */
  async isEffective(accountId: string, client?: TransactionClientContract) {
    const context = await this.contexts.current(client)

    if (!context) return false

    const grant = await this.effectiveAccess.authorize(
      accountId,
      'intake.record',
      context.custodialOrganizationalUnitId,
      client
    )

    return Boolean(grant)
  }

  /** Locks the context and exact direct or delegated grant used by an intake write. */
  async authorizeIntake(
    trx: TransactionClientContract,
    actorAccountId: string,
    now: DateTime<true>
  ): Promise<CentralStoreIntakeAuthorization> {
    const actor = await this.lockActor(trx, actorAccountId)
    const context = await this.contexts.latest(trx, true)

    if (!context) {
      throw new CentralStoreAuthorityChangedException(
        'The Central Store context is not configured.'
      )
    }

    if (actor.status !== 'ACTIVE') {
      throw new CentralStoreAuthorityChangedException('The acting account is no longer active.')
    }

    const organizationalUnit = await OrganizationalUnit.query({ client: trx })
      .where('id', context.custodialOrganizationalUnitId)
      .forUpdate()
      .firstOrFail()

    const physicalLocation = await PhysicalLocation.query({ client: trx })
      .where('id', context.physicalLocationId)
      .forUpdate()
      .firstOrFail()

    if (organizationalUnit.archivedAt) {
      throw new CentralStoreAuthorityChangedException(
        'The configured Central Store custodial organizational unit is no longer active.'
      )
    }

    if (physicalLocation.archivedAt) {
      throw new CentralStoreAuthorityChangedException(
        'The configured Central Store physical location is no longer active.'
      )
    }

    const initialGrant = await this.effectiveAccess.authorize(
      actor.id,
      'intake.record',
      organizationalUnit.id,
      trx,
      now
    )

    if (!initialGrant) {
      throw new CentralStoreAuthorityChangedException(
        'The acting account no longer has intake.record authority for the configured Central Store custodial organizational unit.'
      )
    }

    await this.lockGrant(trx, initialGrant)
    const revalidatedGrant = await this.effectiveAccess.authorize(
      actor.id,
      'intake.record',
      organizationalUnit.id,
      trx,
      now
    )

    if (!revalidatedGrant || !this.sameGrant(initialGrant, revalidatedGrant)) {
      throw new CentralStoreAuthorityChangedException(
        'The intake.record grant changed while Central Store intake authority was being checked.'
      )
    }

    return { context, grant: revalidatedGrant }
  }
}
