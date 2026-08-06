import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import RolePolicy from '#policies/role_policy'
import PermissionDirectoryService from '#services/permission_directory_service'
import PermissionTransformer from '#transformers/permission_transformer'

@inject()
export default class PermissionsController {
  constructor(private directory: PermissionDirectoryService) {}

  async index({ bouncer, serialize }: HttpContext) {
    await bouncer.with(RolePolicy).authorize('listPermissions')

    const permissions = await this.directory.list()

    return serialize(PermissionTransformer.transform(permissions))
  }
}
