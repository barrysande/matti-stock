import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import DuplicateException from '#exceptions/duplicate_exception'
import OrganizationalUnit from '#models/organizational_unit'
import Person from '#models/person'
import Role from '#models/role'
import RoleAssignment from '#models/role_assignment'
import RoleVersion from '#models/role_version'
import RoleVersionPermission from '#models/role_version_permission'
import UserAccount from '#models/user_account'
import AccessEventService from '#services/access_event_service'
import GeneratedPasswordService from '#services/generated_password_service'
import OrganizationalUnitHistoryService from '#services/organizational_unit_history_service'
import PasswordChallengeService from '#services/password_challenge_service'
import type { masterAdminBootstrapValidator } from '#validators/master_admin'
import type { Infer } from '@vinejs/vine/types'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

type BootstrapData = Infer<typeof masterAdminBootstrapValidator>

const DUPLICATE_MESSAGE = 'The Master Admin bootstrap identity already exists'
const DUPLICATE_CONSTRAINTS = ['people_primary_email_unique', 'user_accounts_email_unique'] as const

@inject()
export default class MasterAdminBootstrapService {
  constructor(
    private accessEvents: AccessEventService,
    private passwords: GeneratedPasswordService,
    private passwordChallenges: PasswordChallengeService,
    private organizationalHistory: OrganizationalUnitHistoryService
  ) {}

  private async findMasterRoleVersion(trx: TransactionClientContract) {
    const role = await Role.query({ client: trx })
      .where('key', 'MASTER_ADMIN')
      .whereNull('archived_at')
      .first()
    if (!role || !role.systemManaged) {
      throw new Error('The active MASTER_ADMIN role is missing from the access registry')
    }

    const version = await RoleVersion.query({ client: trx })
      .where('role_id', role.id)
      .where('version', 1)
      .first()
    if (!version) {
      throw new Error('MASTER_ADMIN version 1 is missing from the access registry')
    }

    const accessRoot = await RoleVersionPermission.query({ client: trx })
      .where('role_version_id', version.id)
      .where('permission_key', 'access.root')
      .first()
    if (!accessRoot) {
      throw new Error('MASTER_ADMIN version 1 does not grant access.root')
    }

    return version
  }

  private async findOrCreateInstitute(trx: TransactionClientContract, name: string) {
    const institute = await OrganizationalUnit.query({ client: trx })
      .where('unit_type', 'INSTITUTE')
      .whereNull('archived_at')
      .first()

    if (institute) {
      if (institute.name !== name) {
        throw new Error('The active institute root does not match the bootstrap institute name')
      }
      return { institute, created: false }
    }

    const created = await OrganizationalUnit.create(
      {
        name,
        unitType: 'INSTITUTE',
        parentId: null,
      },
      { client: trx }
    )

    return { institute: created, created: true }
  }

  private createBootstrap(data: BootstrapData) {
    return db.transaction(async (trx) => {
      const roleVersion = await this.findMasterRoleVersion(trx)
      const instituteResult = await this.findOrCreateInstitute(trx, data.instituteName)
      const institute = instituteResult.institute
      const temporaryPassword = this.passwords.generate()
      const now = DateTime.now()

      if (instituteResult.created) {
        await this.organizationalHistory.createInitialVersion(
          institute,
          'Deployment-created institute root',
          null,
          trx,
          now
        )
      }

      const person = await Person.create(
        {
          displayName: data.masterName,
          staffNumber: null,
          primaryEmail: data.masterEmail,
          primaryEmailVerifiedAt: null,
        },
        { client: trx }
      )
      const account = await UserAccount.create(
        {
          personId: person.id,
          email: data.masterEmail,
          password: temporaryPassword,
          status: 'INVITED',
          credentialVersion: 1,
          passwordResetVersion: 0,
        },
        { client: trx }
      )

      const challenge = await this.passwordChallenges.issueInitialSetup(account, {}, trx)

      const assignment = await RoleAssignment.create(
        {
          accountId: account.id,
          roleVersionId: roleVersion.id,
          scopeOrgUnitId: institute.id,
          scopeMode: 'INCLUDE_DESCENDANTS',
          startsAt: now,
          expiresAt: null,
          grantedByAccountId: null,
          reason: 'Deployment-created V1 access root',
        },
        { client: trx }
      )

      await this.accessEvents.record(
        {
          eventType: 'MASTER_ADMIN_BOOTSTRAPPED',
          actorType: 'SYSTEM',
          targetType: 'USER_ACCOUNT',
          targetId: account.id,
          reason: 'Initial deployment access establishment',
          metadata: {
            personId: person.id,
            instituteId: institute.id,
            roleVersionId: roleVersion.id,
            challengeId: challenge.id,
            challengePurpose: challenge.purpose,
          },
        },
        trx
      )

      return { account, assignment, challenge, person }
    })
  }

  /** Establishes the initial institute root, Master Admin identity, assignment, and setup challenge. */
  async run(data: BootstrapData) {
    try {
      return await this.createBootstrap(data)
    } catch (error) {
      DuplicateException.throwIf(error, DUPLICATE_MESSAGE, DUPLICATE_CONSTRAINTS)
    }
  }
}
