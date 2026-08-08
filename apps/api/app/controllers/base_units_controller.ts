import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import BaseUnitPolicy from '#policies/base_unit_policy'
import BaseUnitAdministrationService from '#services/base_unit_administration_service'
import BaseUnitDirectoryService from '#services/base_unit_directory_service'
import BaseUnitProvisioningService from '#services/base_unit_provisioning_service'
import BaseUnitVersionDirectoryService from '#services/base_unit_version_directory_service'
import BaseUnitTransformer from '#transformers/base_unit_transformer'
import BaseUnitVersionTransformer from '#transformers/base_unit_version_transformer'
import {
  administerBaseUnitValidator,
  baseUnitHistoryValidator,
  baseUnitOptionsValidator,
  createBaseUnitValidator,
  indexBaseUnitsValidator,
  updateBaseUnitDetailsValidator,
} from '#validators/base_unit'

@inject()
export default class BaseUnitsController {
  constructor(
    private administration: BaseUnitAdministrationService,
    private directory: BaseUnitDirectoryService,
    private provisioning: BaseUnitProvisioningService,
    private versionDirectory: BaseUnitVersionDirectoryService
  ) {}

  async store({ auth, bouncer, request, response }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('create')

    const payload = await request.validateUsing(createBaseUnitValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id)

    return response.created({ message: 'Base unit created.' })
  }

  async updateDetails({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('updateDetails')

    const payload = await request.validateUsing(updateBaseUnitDetailsValidator)

    const actor = auth.getUserOrFail()

    await this.administration.updateDetails(params.id, payload, actor.id)

    return response.ok({ message: 'Base unit details updated.' })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('list')

    const filters = await request.validateUsing(indexBaseUnitsValidator)

    const units = await this.directory.paginate(filters)

    return serialize(BaseUnitTransformer.paginate(units.all(), units.getMeta()))
  }

  async options({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('list')

    const filters = await request.validateUsing(baseUnitOptionsValidator)

    const units = await this.directory.listOptions(filters)

    return serialize(BaseUnitTransformer.transform(units))
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('view')

    const unit = await this.directory.findDetails(params.id)

    return serialize(BaseUnitTransformer.transform(unit).useVariant('forDetailedView'))
  }

  async history({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('view')

    const filters = await request.validateUsing(baseUnitHistoryValidator)

    const versions = await this.versionDirectory.list(params.id, filters)

    return serialize(BaseUnitVersionTransformer.paginate(versions.all(), versions.getMeta()))
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('archive')

    const payload = await request.validateUsing(administerBaseUnitValidator)

    const actor = auth.getUserOrFail()

    await this.administration.archive(params.id, payload, actor.id)

    return response.ok({ message: 'Base unit archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(BaseUnitPolicy).authorize('restore')

    const payload = await request.validateUsing(administerBaseUnitValidator)

    const actor = auth.getUserOrFail()

    await this.administration.restore(params.id, payload, actor.id)

    return response.ok({ message: 'Base unit restored.' })
  }
}
