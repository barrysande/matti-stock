import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RolePolicy from '#policies/role_policy'
import RoleAdministrationService from '#services/role_administration_service'
import RoleDirectoryService from '#services/role_directory_service'
import RoleProvisioningService from '#services/role_provisioning_service'
import RoleTransformer from '#transformers/role_transformer'
import {
  administerRoleValidator,
  createRoleValidator,
  indexRolesValidator,
  renameRoleValidator,
  replaceRolePermissionsValidator,
} from '#validators/role'

@inject()
export default class RolesController {
  constructor(
    private administration: RoleAdministrationService,
    private directory: RoleDirectoryService,
    private provisioning: RoleProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('create')

    const payload = await request.validateUsing(createRoleValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Role created.' })
  }

  async rename({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('rename')

    const payload = await request.validateUsing(renameRoleValidator)
    const actor = auth.getUserOrFail()
    await this.administration.rename(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Role renamed.' })
  }

  async replacePermissions({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('replacePermissions')

    const payload = await request.validateUsing(replaceRolePermissionsValidator)
    const actor = auth.getUserOrFail()
    await this.administration.replacePermissions(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'A new role permission version was created.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('list')

    const filters = await request.validateUsing(indexRolesValidator)
    const roles = await this.directory.list(filters)
    return serialize(RoleTransformer.transform(roles))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('view')

    const role = await this.directory.overview(params.id)
    return serialize(RoleTransformer.transform(role).useVariant('forOverview'))
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('archive')

    const payload = await request.validateUsing(administerRoleValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Role archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('restore')

    const payload = await request.validateUsing(administerRoleValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Role restored.' })
  }
}
