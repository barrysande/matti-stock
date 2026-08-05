import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import CatalogueAuthorityChangedException from '#exceptions/catalogue_authority_changed_exception'
import Delegation from '#models/delegation'
import OrganizationalUnit from '#models/organizational_unit'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import UserAccount from '#models/user_account'
import EffectiveAccessService from '#services/effective_access_service'
import type { CatalogueAuthorization } from '#types/catalogue'
import type { EffectiveAccessGrant } from '#types/role_assignment'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

@inject()
export default class CatalogueAuthorityService {
  constructor(private effectiveAccess: EffectiveAccessService) {}

  private activeInstitute(client?: TransactionClientContract) {
    const query = client ? OrganizationalUnit.query({ client }) : OrganizationalUnit.query()

    return query.where('unit_type', 'INSTITUTE').whereNull('archived_at').first()
  }

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

  private lockAssignment(trx: TransactionClientContract, assignmentId: string) {
    return RoleAssignment.query({ client: trx }).where('id', assignmentId).forUpdate().firstOrFail()
  }

  private lockRole(trx: TransactionClientContract, roleId: string) {
    return Role.query({ client: trx }).where('id', roleId).forUpdate().firstOrFail()
  }

  private async lockGrant(trx: TransactionClientContract, grant: EffectiveAccessGrant) {
    await this.lockAssignment(trx, grant.assignmentId)
    await this.lockRole(trx, grant.roleId)

    if (grant.delegationId) {
      await Delegation.query({ client: trx })
        .where('id', grant.delegationId)
        .forUpdate()
        .firstOrFail()
    }
  }

  /** Checks current institution-root catalogue authority for Bouncer policies. */
  async isEffective(accountId: string, client?: TransactionClientContract) {
    const institute = await this.activeInstitute(client)
    if (!institute) return false

    const grant = await this.effectiveAccess.authorize(
      accountId,
      'catalogue.manage',
      institute.id,
      client
    )
    return Boolean(grant)
  }

  /** Locks and revalidates the exact direct or delegated grant used by a catalogue mutation. */
  async authorizeMutation(
    trx: TransactionClientContract,
    actorAccountId: string,
    now: DateTime<true>
  ): Promise<CatalogueAuthorization> {
    const actor = await this.lockActor(trx, actorAccountId)
    const institute = await this.activeInstitute(trx)

    if (!institute || actor.status !== 'ACTIVE') {
      throw new CatalogueAuthorityChangedException()
    }

    await OrganizationalUnit.query({ client: trx })
      .where('id', institute.id)
      .forUpdate()
      .firstOrFail()

    const initialGrant = await this.effectiveAccess.authorize(
      actor.id,
      'catalogue.manage',
      institute.id,
      trx,
      now
    )
    if (!initialGrant) {
      throw new CatalogueAuthorityChangedException()
    }

    await this.lockGrant(trx, initialGrant)

    const revalidatedGrant = await this.effectiveAccess.authorize(
      actor.id,
      'catalogue.manage',
      institute.id,
      trx,
      now
    )
    if (!revalidatedGrant || !this.sameGrant(initialGrant, revalidatedGrant)) {
      throw new CatalogueAuthorityChangedException()
    }

    return {
      grant: revalidatedGrant,
      instituteOrganizationalUnitId: institute.id,
    }
  }
}
