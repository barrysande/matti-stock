import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PhysicalLocationPolicy from '#policies/physical_location_policy'
import PhysicalLocationAdministrationService from '#services/physical_location_administration_service'
import PhysicalLocationDirectoryService from '#services/physical_location_directory_service'
import PhysicalLocationProvisioningService from '#services/physical_location_provisioning_service'
import PhysicalLocationTransformer from '#transformers/physical_location_transformer'
import {
  administerPhysicalLocationValidator,
  createPhysicalLocationValidator,
  indexPhysicalLocationsValidator,
  renamePhysicalLocationValidator,
  reparentPhysicalLocationValidator,
} from '#validators/physical_location'

@inject()
export default class PhysicalLocationsController {
  constructor(
    private administration: PhysicalLocationAdministrationService,
    private directory: PhysicalLocationDirectoryService,
    private provisioning: PhysicalLocationProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('create')

    const payload = await request.validateUsing(createPhysicalLocationValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Physical location created.' })
  }

  async rename({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('rename')

    const payload = await request.validateUsing(renamePhysicalLocationValidator)
    const actor = auth.getUserOrFail()
    await this.administration.rename(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location renamed.' })
  }

  async reparent({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('reparent')

    const payload = await request.validateUsing(reparentPhysicalLocationValidator)
    const actor = auth.getUserOrFail()
    await this.administration.reparent(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location moved.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('list')

    const filters = await request.validateUsing(indexPhysicalLocationsValidator)
    const locations = await this.directory.list(filters)

    return serialize(PhysicalLocationTransformer.transform(locations))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('view')

    const location = await this.directory.findDetails(params.id)
    return serialize(PhysicalLocationTransformer.transform(location).useVariant('forDetailedView'))
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('archive')

    const payload = await request.validateUsing(administerPhysicalLocationValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('restore')

    const payload = await request.validateUsing(administerPhysicalLocationValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location restored.' })
  }
}
