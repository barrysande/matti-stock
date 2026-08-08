import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RolePolicy from '#policies/role_policy'
import RoleAdministrationService from '#services/role_administration_service'
import RoleDirectoryService from '#services/role_directory_service'
import RoleProvisioningService from '#services/role_provisioning_service'
import RoleVersionDirectoryService from '#services/role_version_directory_service'
import RoleTransformer from '#transformers/role_transformer'
import RoleVersionTransformer from '#transformers/role_version_transformer'
import {
  administerRoleValidator,
  createRoleValidator,
  indexRolesValidator,
  renameRoleValidator,
  replaceRolePermissionsValidator,
  roleHistoryValidator,
  roleOptionsValidator,
} from '#validators/role'

@inject()
export default class RolesController {
  constructor(
    private administration: RoleAdministrationService,
    private directory: RoleDirectoryService,
    private provisioning: RoleProvisioningService,
    private versionDirectory: RoleVersionDirectoryService
  ) {}

  async store({ auth, bouncer, request, response }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('create')

    const payload = await request.validateUsing(createRoleValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.created({ message: 'Role created.' })
  }

  async rename({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('rename')

    const payload = await request.validateUsing(renameRoleValidator)

    const actor = auth.getUserOrFail()

    await this.administration.rename(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Role renamed.' })
  }

  async replacePermissions({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('replacePermissions')

    const payload = await request.validateUsing(replaceRolePermissionsValidator)

    const actor = auth.getUserOrFail()

    await this.administration.replacePermissions(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'A new role permission version was created.' })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('list')

    const filters = await request.validateUsing(indexRolesValidator)

    const roles = await this.directory.paginate(filters)

    return serialize(RoleTransformer.paginate(roles.all(), roles.getMeta()))
  }

  async options({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('list')

    const filters = await request.validateUsing(roleOptionsValidator)

    const roles = await this.directory.listOptions(filters)

    return serialize(RoleTransformer.transform(roles))
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('view')

    const role = await this.directory.findDetails(params.id)

    return serialize(RoleTransformer.transform(role).useVariant('forDetailedView'))
  }

  async history({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('view')

    const filters = await request.validateUsing(roleHistoryValidator)

    const versions = await this.versionDirectory.list(params.id, filters)

    return serialize(RoleVersionTransformer.paginate(versions.all(), versions.getMeta()))
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('archive')

    const payload = await request.validateUsing(administerRoleValidator)

    const actor = auth.getUserOrFail()

    await this.administration.archive(params.id, payload, actor.id, {
      ip: request.ip(),
      requestId: request.id(),
    })

    return response.ok({ message: 'Role archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
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
