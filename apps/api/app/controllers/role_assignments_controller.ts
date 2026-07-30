import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RoleAssignmentPolicy from '#policies/role_assignment_policy'
import RoleAssignmentAdministrationService from '#services/role_assignment_administration_service'
import RoleAssignmentDirectoryService from '#services/role_assignment_directory_service'
import RoleAssignmentProvisioningService from '#services/role_assignment_provisioning_service'
import RoleAssignmentTransformer from '#transformers/role_assignment_transformer'
import {
  administerRoleAssignmentValidator,
  createRoleAssignmentValidator,
  indexRoleAssignmentsValidator,
  replaceRoleAssignmentValidator,
} from '#validators/role_assignment'

@inject()
export default class RoleAssignmentsController {
  constructor(
    private administration: RoleAssignmentAdministrationService,
    private directory: RoleAssignmentDirectoryService,
    private provisioning: RoleAssignmentProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('create')

    const payload = await request.validateUsing(createRoleAssignmentValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })
    return response.created({ message: 'Role assignment created.' })
  }

  async replace({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('replace')

    const payload = await request.validateUsing(replaceRoleAssignmentValidator)
    const actor = auth.getUserOrFail()
    await this.administration.replace(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })
    return response.ok({ message: 'Role assignment replaced.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('list')

    const filters = await request.validateUsing(indexRoleAssignmentsValidator)
    const assignments = await this.directory.list(filters)
    return serialize(RoleAssignmentTransformer.paginate(assignments.all(), assignments.getMeta()))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('view')

    const assignment = await this.directory.overview(params.id)
    return serialize(RoleAssignmentTransformer.transform(assignment).useVariant('forOverview'))
  }

  async cancel({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('cancel')

    const payload = await request.validateUsing(administerRoleAssignmentValidator)
    const actor = auth.getUserOrFail()
    await this.administration.cancel(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })
    return response.ok({ message: 'Upcoming role assignment cancelled.' })
  }

  async end({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RoleAssignmentPolicy).authorize('end')

    const payload = await request.validateUsing(administerRoleAssignmentValidator)
    const actor = auth.getUserOrFail()
    await this.administration.end(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })
    return response.ok({ message: 'Role assignment ended.' })
  }
}
