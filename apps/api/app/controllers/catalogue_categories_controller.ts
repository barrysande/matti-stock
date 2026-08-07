import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CatalogueCategoryPolicy from '#policies/catalogue_category_policy'
import CatalogueCategoryAdministrationService from '#services/catalogue_category_administration_service'
import CatalogueCategoryDirectoryService from '#services/catalogue_category_directory_service'
import CatalogueCategoryMergePreviewService from '#services/catalogue_category_merge_preview_service'
import CatalogueCategoryMergeService from '#services/catalogue_category_merge_service'
import CatalogueCategoryProvisioningService from '#services/catalogue_category_provisioning_service'
import CatalogueCategorySimilarityService from '#services/catalogue_category_similarity_service'
import CatalogueCategoryCreationReviewTransformer from '#transformers/catalogue_category_creation_review_transformer'
import CatalogueCategoryTransformer from '#transformers/catalogue_category_transformer'
import CatalogueCategoryMergePreviewTransformer from '#transformers/catalogue_category_merge_preview_transformer'
import {
  administerCatalogueCategoryValidator,
  createCatalogueCategoryValidator,
  indexCatalogueCategoriesValidator,
  mergeCatalogueCategoryValidator,
  previewCatalogueCategoryMergeValidator,
  reparentCatalogueCategoryValidator,
  reviewCatalogueCategoryCreationValidator,
  updateCatalogueCategoryDetailsValidator,
} from '#validators/catalogue_category'

@inject()
export default class CatalogueCategoriesController {
  constructor(
    private administration: CatalogueCategoryAdministrationService,
    private directory: CatalogueCategoryDirectoryService,
    private mergePreview: CatalogueCategoryMergePreviewService,
    private mergeService: CatalogueCategoryMergeService,
    private provisioning: CatalogueCategoryProvisioningService,
    private similarity: CatalogueCategorySimilarityService
  ) {}

  async store({ auth, bouncer, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('create')

    const payload = await request.validateUsing(createCatalogueCategoryValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id)

    return response.created({ message: 'Catalogue category created.' })
  }

  async creationReview({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('review')

    const payload = await request.validateUsing(reviewCatalogueCategoryCreationValidator)

    return serialize(
      CatalogueCategoryCreationReviewTransformer.transform(await this.similarity.review(payload))
    )
  }

  async updateDetails({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('updateDetails')

    const payload = await request.validateUsing(updateCatalogueCategoryDetailsValidator)

    const actor = auth.getUserOrFail()

    await this.administration.updateDetails(params.id, payload, actor.id)

    return response.ok({ message: 'Catalogue category details updated.' })
  }

  async reparent({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('reparent')

    const payload = await request.validateUsing(reparentCatalogueCategoryValidator)

    const actor = auth.getUserOrFail()

    await this.administration.reparent(params.id, payload, actor.id)

    return response.ok({ message: 'Catalogue category moved.' })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('list')

    const filters = await request.validateUsing(indexCatalogueCategoriesValidator)

    return serialize(CatalogueCategoryTransformer.transform(await this.directory.list(filters)))
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('view')

    const category = await this.directory.findDetails(params.id)

    return serialize(CatalogueCategoryTransformer.transform(category).useVariant('forDetailedView'))
  }

  async previewMerge({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('previewMerge')

    const payload = await request.validateUsing(previewCatalogueCategoryMergeValidator)

    const preview = await this.mergePreview.preview(params.id, payload.targetCategoryId)

    return serialize(CatalogueCategoryMergePreviewTransformer.transform(preview))
  }

  async merge({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('merge')

    const payload = await request.validateUsing(mergeCatalogueCategoryValidator)

    const actor = auth.getUserOrFail()

    await this.mergeService.merge(params.id, payload, actor.id)

    return response.ok({ message: 'Catalogue category merged.' })
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('archive')

    const payload = await request.validateUsing(administerCatalogueCategoryValidator)

    const actor = auth.getUserOrFail()

    await this.administration.archive(params.id, payload, actor.id)

    return response.ok({ message: 'Catalogue category archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueCategoryPolicy).authorize('restore')

    const payload = await request.validateUsing(administerCatalogueCategoryValidator)

    const actor = auth.getUserOrFail()

    await this.administration.restore(params.id, payload, actor.id)

    return response.ok({ message: 'Catalogue category restored.' })
  }
}
