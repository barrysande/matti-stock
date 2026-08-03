import { inject } from '@adonisjs/core'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import AccountCredentialRecoveryException from '#exceptions/account_credential_recovery_exception'
import AccessRootAuthorityService from '#services/access_root_authority_service'
import PasswordChallengeService from '#services/password_challenge_service'
import type { RequestAuditContext } from '#types/access'
import type { administerAccountValidator } from '#validators/account'
import type { Infer } from '@vinejs/vine/types'

type AdministerData = Infer<typeof administerAccountValidator>

@inject()
export default class AccountCredentialAdministrationService {
  constructor(
    private rootAuthority: AccessRootAuthorityService,
    private passwordChallenges: PasswordChallengeService
  ) {}

  requestPasswordReset(
    accountId: string,
    data: AdministerData,
    actorAccountId: string,
    request?: RequestAuditContext
  ) {
    return db.transaction(async (trx) => {
      const now = DateTime.now()
      const { actor, target } = await this.rootAuthority.lockAdministrationAccounts(
        trx,
        actorAccountId,
        accountId
      )

      await this.rootAuthority.assertEffectiveActor(actor, trx, now)

      if (!['INVITED', 'ACTIVE'].includes(target.status)) {
        throw new AccountCredentialRecoveryException()
      }

      const challenge = await this.passwordChallenges.issueForAdministration(
        target,
        actorAccountId,
        data.reason,
        request ?? {},
        trx
      )

      return { account: target, challenge }
    })
  }
}
