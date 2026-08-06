import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CategoryAttributePolicy from '#policies/category_attribute_policy'
import CategoryAttributeAdministrationService from '#services/category_attribute_administration_service'
import CategoryAttributeDirectoryService from '#services/category_attribute_directory_service'
import CategoryAttributeProvisioningService from '#services/category_attribute_provisioning_service'
import CategoryAttributeSemanticAdministrationService from '#services/category_attribute_semantic_administration_service'
import CategoryAttributeTransformer from '#transformers/category_attribute_transformer'
import {
  administerCategoryAttributeValidator,
  createCategoryAttributeValidator,
  indexCategoryAttributesValidator,
  updateCategoryAttributeDetailsValidator,
  updateCategoryAttributeSemanticsValidator,
} from '#validators/category_attribute'

@inject()
export default class CategoryAttributesController {
  constructor(
    private administration: CategoryAttributeAdministrationService,
    private directory: CategoryAttributeDirectoryService,
    private provisioning: CategoryAttributeProvisioningService,
    private semanticAdministration: CategoryAttributeSemanticAdministrationService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('create')
    const payload = await request.validateUsing(createCategoryAttributeValidator)
    const actor = auth.getUserOrFail()
    await this.provisioning.create(payload, actor.id)
    return response.created({ message: 'Category attribute created.' })
  }

  async updateDetails({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('updateDetails')
    const payload = await request.validateUsing(updateCategoryAttributeDetailsValidator)
    const actor = auth.getUserOrFail()
    await this.administration.updateDetails(params.id, payload, actor.id)
    return response.ok({ message: 'Category attribute details updated.' })
  }

  async updateSemantics({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('updateSemantics')
    const payload = await request.validateUsing(updateCategoryAttributeSemanticsValidator)
    const actor = auth.getUserOrFail()
    await this.semanticAdministration.update(params.id, payload, actor.id)
    return response.ok({ message: 'Category attribute semantics updated.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('list')
    const filters = await request.validateUsing(indexCategoryAttributesValidator)
    return serialize(CategoryAttributeTransformer.transform(await this.directory.list(filters)))
  }

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('view')
    const attribute = await this.directory.findDetails(params.id)
    return serialize(
      CategoryAttributeTransformer.transform(attribute).useVariant('forDetailedView')
    )
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('archive')
    const payload = await request.validateUsing(administerCategoryAttributeValidator)
    const actor = auth.getUserOrFail()
    await this.administration.archive(params.id, payload, actor.id)
    return response.ok({ message: 'Category attribute archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('restore')
    const payload = await request.validateUsing(administerCategoryAttributeValidator)
    const actor = auth.getUserOrFail()
    await this.administration.restore(params.id, payload, actor.id)
    return response.ok({ message: 'Category attribute restored.' })
  }
}
