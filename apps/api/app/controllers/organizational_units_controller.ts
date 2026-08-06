import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import OrganizationalUnitPolicy from '#policies/organizational_unit_policy'
import OrganizationalAccessImpactService from '#services/organizational_access_impact_service'
import OrganizationalUnitAdministrationService from '#services/organizational_unit_administration_service'
import OrganizationalUnitDirectoryService from '#services/organizational_unit_directory_service'
import OrganizationalUnitProvisioningService from '#services/organizational_unit_provisioning_service'
import OrganizationalUnitTransformer from '#transformers/organizational_unit_transformer'
import {
  administerOrganizationalUnitValidator,
  createOrganizationalUnitValidator,
  indexOrganizationalUnitsValidator,
  previewOrganizationalAccessImpactValidator,
  renameOrganizationalUnitValidator,
  reparentOrganizationalUnitValidator,
} from '#validators/organizational_unit'

@inject()
export default class OrganizationalUnitsController {
  constructor(
    private administration: OrganizationalUnitAdministrationService,
    private accessImpactService: OrganizationalAccessImpactService,
    private directory: OrganizationalUnitDirectoryService,
    private provisioning: OrganizationalUnitProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('create')

    const payload = await request.validateUsing(createOrganizationalUnitValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Organizational unit created.' })
  }

  async rename({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('rename')

    const payload = await request.validateUsing(renameOrganizationalUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.rename(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Organizational unit renamed.' })
  }

  async reparent({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('reparent')

    const payload = await request.validateUsing(reparentOrganizationalUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.reparent(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Organizational unit moved.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('list')

    const filters = await request.validateUsing(indexOrganizationalUnitsValidator)
    const units = await this.directory.list(filters)

    return serialize(OrganizationalUnitTransformer.transform(units))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('view')

    const unit = await this.directory.findDetails(params.id)
    return serialize(OrganizationalUnitTransformer.transform(unit).useVariant('forDetailedView'))
  }

  async accessImpact({ params, request, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('previewAccessImpact')

    const payload = await request.validateUsing(previewOrganizationalAccessImpactValidator)
    return this.accessImpactService.preview({
      operation: payload.operation,
      targetUnitId: params.id,
      parentId: payload.parentId,
      childUnitType: payload.childUnitType,
    })
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('archive')

    const payload = await request.validateUsing(administerOrganizationalUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Organizational unit archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(OrganizationalUnitPolicy).authorize('restore')

    const payload = await request.validateUsing(administerOrganizationalUnitValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Organizational unit restored.' })
  }
}
