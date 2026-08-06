import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import DelegationPolicy from '#policies/delegation_policy'
import DelegationDirectoryService from '#services/delegation_directory_service'
import DelegationProposalOptionsService from '#services/delegation_proposal_options_service'
import DelegationProvisioningService from '#services/delegation_provisioning_service'
import DelegationResponseService from '#services/delegation_response_service'
import DelegationTerminationService from '#services/delegation_termination_service'
import DelegationTransformer from '#transformers/delegation_transformer'
import DelegationProposalOptionsTransformer from '#transformers/delegation_proposal_options_transformer'
import {
  acceptDelegationValidator,
  createDelegationValidator,
  delegationProposalOptionsValidator,
  indexDelegationsValidator,
  rejectDelegationValidator,
  terminateDelegationValidator,
} from '#validators/delegation'

@inject()
export default class DelegationsController {
  constructor(
    private provisioning: DelegationProvisioningService,
    private directory: DelegationDirectoryService,
    private proposalOptionsService: DelegationProposalOptionsService,
    private responses: DelegationResponseService,
    private terminations: DelegationTerminationService
  ) {}

  async store({ auth, request, response }: HttpContext) {
    const payload = await request.validateUsing(createDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Delegation proposed.' })
  }

  async index({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(indexDelegationsValidator)

    const actor = auth.getUserOrFail()

    const delegations = await this.directory.list(filters, actor.id)

    return serialize(DelegationTransformer.paginate(delegations.all(), delegations.getMeta()))
  }

  async show({ auth, params, serialize }: HttpContext) {
    const actor = auth.getUserOrFail()

    const delegation = await this.directory.findDetails(params.id, actor.id)

    return serialize(DelegationTransformer.transform(delegation).useVariant('forDetailedView'))
  }

  async proposalOptions({ auth, request, serialize }: HttpContext) {
    const filters = await request.validateUsing(delegationProposalOptionsValidator)

    const actor = auth.getUserOrFail()

    const options = await this.proposalOptionsService.get(filters, actor.id)

    return serialize(DelegationProposalOptionsTransformer.transform(options))
  }

  async accept({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(acceptDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.responses.accept(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Delegation accepted.' })
  }

  async reject({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(rejectDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.responses.reject(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Delegation rejected.' })
  }

  async revoke({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(terminateDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.terminations.revoke(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Delegation revoked.' })
  }

  async relinquish({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(terminateDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.terminations.relinquish(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Delegation relinquished.' })
  }

  async terminate({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(DelegationPolicy).authorize('terminate')

    const payload = await request.validateUsing(terminateDelegationValidator)

    const actor = auth.getUserOrFail()

    await this.terminations.administrativelyTerminate(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Delegation administratively terminated.' })
  }
}
