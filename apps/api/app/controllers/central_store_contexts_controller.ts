import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CentralStoreContextPolicy from '#policies/central_store_context_policy'
import CentralStoreContextConfigurationService from '#services/central_store_context_configuration_service'
import CentralStoreContextDirectoryService from '#services/central_store_context_directory_service'
import CentralStoreContextVersionTransformer from '#transformers/central_store_context_version_transformer'
import {
  centralStoreContextHistoryValidator,
  configureCentralStoreContextValidator,
} from '#validators/central_store_context'

@inject()
export default class CentralStoreContextsController {
  constructor(
    private configuration: CentralStoreContextConfigurationService,
    private directory: CentralStoreContextDirectoryService
  ) {}

  async store({ auth, bouncer, request, response, serialize }: HttpContext) {
    await bouncer.with(CentralStoreContextPolicy).authorize('configure')

    const payload = await request.validateUsing(configureCentralStoreContextValidator)

    const actor = auth.getUserOrFail()

    const context = await this.configuration.configure(payload, actor.id)

    response.status(Number(context.version) === 1 ? 201 : 200)

    return serialize(CentralStoreContextVersionTransformer.transform(context))
  }

  async show({ bouncer, response, serialize }: HttpContext) {
    await bouncer.with(CentralStoreContextPolicy).authorize('view')

    const context = await this.directory.current()

    return context
      ? serialize(CentralStoreContextVersionTransformer.transform(context))
      : response.ok({ data: null })
  }

  async history({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CentralStoreContextPolicy).authorize('viewHistory')

    const filters = await request.validateUsing(centralStoreContextHistoryValidator)

    const contexts = await this.directory.history(filters)

    return serialize(
      CentralStoreContextVersionTransformer.paginate(contexts.all(), contexts.getMeta())
    )
  }
}
