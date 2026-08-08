import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PhysicalLocationPolicy from '#policies/physical_location_policy'
import PhysicalLocationAdministrationService from '#services/physical_location_administration_service'
import PhysicalLocationDirectoryService from '#services/physical_location_directory_service'
import PhysicalLocationLifecycleService from '#services/physical_location_lifecycle_service'
import PhysicalLocationProvisioningService from '#services/physical_location_provisioning_service'
import PhysicalLocationVersionDirectoryService from '#services/physical_location_version_directory_service'
import PhysicalLocationTransformer from '#transformers/physical_location_transformer'
import PhysicalLocationVersionTransformer from '#transformers/physical_location_version_transformer'
import {
  administerPhysicalLocationValidator,
  createPhysicalLocationValidator,
  indexPhysicalLocationsValidator,
  physicalLocationHistoryValidator,
  renamePhysicalLocationValidator,
  reparentPhysicalLocationValidator,
} from '#validators/physical_location'

@inject()
export default class PhysicalLocationsController {
  constructor(
    private administration: PhysicalLocationAdministrationService,
    private directory: PhysicalLocationDirectoryService,
    private lifecycle: PhysicalLocationLifecycleService,
    private provisioning: PhysicalLocationProvisioningService,
    private versionDirectory: PhysicalLocationVersionDirectoryService
  ) {}

  async store({ auth, bouncer, request, response }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('create')

    const payload = await request.validateUsing(createPhysicalLocationValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Physical location created.' })
  }

  async rename({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('rename')

    const payload = await request.validateUsing(renamePhysicalLocationValidator)

    const actor = auth.getUserOrFail()

    await this.administration.rename(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location renamed.' })
  }

  async reparent({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('reparent')

    const payload = await request.validateUsing(reparentPhysicalLocationValidator)

    const actor = auth.getUserOrFail()

    await this.administration.reparent(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location moved.' })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('list')

    const filters = await request.validateUsing(indexPhysicalLocationsValidator)

    const locations = await this.directory.list(filters)

    return serialize(PhysicalLocationTransformer.transform(locations))
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('view')

    const location = await this.directory.findDetails(params.id)

    return serialize(PhysicalLocationTransformer.transform(location).useVariant('forDetailedView'))
  }

  async history({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('view')

    const filters = await request.validateUsing(physicalLocationHistoryValidator)

    const versions = await this.versionDirectory.list(params.id, filters)

    return serialize(
      PhysicalLocationVersionTransformer.paginate(versions.all(), versions.getMeta())
    )
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('archive')

    const payload = await request.validateUsing(administerPhysicalLocationValidator)

    const actor = auth.getUserOrFail()

    await this.lifecycle.archive(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(PhysicalLocationPolicy).authorize('restore')

    const payload = await request.validateUsing(administerPhysicalLocationValidator)

    const actor = auth.getUserOrFail()

    await this.lifecycle.restore(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Physical location restored.' })
  }
}
