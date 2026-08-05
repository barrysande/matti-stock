import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BaseUnitPolicy from '#policies/base_unit_policy'
import BaseUnitAdministrationService from '#services/base_unit_administration_service'
import BaseUnitDirectoryService from '#services/base_unit_directory_service'
import BaseUnitProvisioningService from '#services/base_unit_provisioning_service'
import BaseUnitTransformer from '#transformers/base_unit_transformer'
import {
  administerBaseUnitValidator,
  createBaseUnitValidator,
  indexBaseUnitsValidator,
  updateBaseUnitDetailsValidator,
} from '#validators/base_unit'

@inject()
export default class BaseUnitsController {
  constructor(
    private administration: BaseUnitAdministrationService,
    private directory: BaseUnitDirectoryService,
    private provisioning: BaseUnitProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('create')
    const payload = await request.validateUsing(createBaseUnitValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id)
    return response.created({ message: 'Base unit created.' })
  }

  async updateDetails({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('updateDetails')
    const payload = await request.validateUsing(updateBaseUnitDetailsValidator)
    const actor = auth.getUserOrFail()
    await this.administration.updateDetails(params.id, payload, actor.id)
    return response.ok({ message: 'Base unit details updated.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('list')
    const filters = await request.validateUsing(indexBaseUnitsValidator)
    return serialize(BaseUnitTransformer.transform(await this.directory.list(filters)))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('view')
    const unit = await this.directory.overview(params.id)
    return serialize(BaseUnitTransformer.transform(unit).useVariant('forOverview'))
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('archive')
    const payload = await request.validateUsing(administerBaseUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id)
    return response.ok({ message: 'Base unit archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('restore')
    const payload = await request.validateUsing(administerBaseUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id)
    return response.ok({ message: 'Base unit restored.' })
  }
}
