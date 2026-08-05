import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CatalogueCategoryPolicy from '#policies/catalogue_category_policy'
import CatalogueCategoryAdministrationService from '#services/catalogue_category_administration_service'
import CatalogueCategoryDirectoryService from '#services/catalogue_category_directory_service'
import CatalogueCategoryProvisioningService from '#services/catalogue_category_provisioning_service'
import CatalogueCategoryTransformer from '#transformers/catalogue_category_transformer'
import {
  administerCatalogueCategoryValidator,
  createCatalogueCategoryValidator,
  indexCatalogueCategoriesValidator,
  reparentCatalogueCategoryValidator,
  updateCatalogueCategoryDetailsValidator,
} from '#validators/catalogue_category'

@inject()
export default class CatalogueCategoriesController {
  constructor(
    private administration: CatalogueCategoryAdministrationService,
    private directory: CatalogueCategoryDirectoryService,
    private provisioning: CatalogueCategoryProvisioningService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('create')
    const payload = await request.validateUsing(createCatalogueCategoryValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id)
    return response.created({ message: 'Catalogue category created.' })
  }

  async updateDetails({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('updateDetails')
    const payload = await request.validateUsing(updateCatalogueCategoryDetailsValidator)
    const actor = auth.getUserOrFail()
    await this.administration.updateDetails(params.id, payload, actor.id)
    return response.ok({ message: 'Catalogue category details updated.' })
  }

  async reparent({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('reparent')
    const payload = await request.validateUsing(reparentCatalogueCategoryValidator)
    const actor = auth.getUserOrFail()
    await this.administration.reparent(params.id, payload, actor.id)
    return response.ok({ message: 'Catalogue category moved.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('list')
    const filters = await request.validateUsing(indexCatalogueCategoriesValidator)
    return serialize(CatalogueCategoryTransformer.transform(await this.directory.list(filters)))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('view')
    const category = await this.directory.overview(params.id)
    return serialize(CatalogueCategoryTransformer.transform(category).useVariant('forOverview'))
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('archive')
    const payload = await request.validateUsing(administerCatalogueCategoryValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id)
    return response.ok({ message: 'Catalogue category archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('restore')
    const payload = await request.validateUsing(administerCatalogueCategoryValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id)
    return response.ok({ message: 'Catalogue category restored.' })
  }
}
