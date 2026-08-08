import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CatalogueItemPolicy from '#policies/catalogue_item_policy'
import CatalogueItemAdministrationService from '#services/catalogue_item_administration_service'
import CatalogueItemClassificationService from '#services/catalogue_item_classification_service'
import CatalogueItemDirectoryService from '#services/catalogue_item_directory_service'
import CatalogueItemProvisioningService from '#services/catalogue_item_provisioning_service'
import CatalogueItemSimilarityService from '#services/catalogue_item_similarity_service'
import CatalogueItemVersionDirectoryService from '#services/catalogue_item_version_directory_service'
import CatalogueItemReviewTransformer from '#transformers/catalogue_item_review_transformer'
import CatalogueItemTransformer from '#transformers/catalogue_item_transformer'
import CatalogueItemVersionTransformer from '#transformers/catalogue_item_version_transformer'
import {
  administerCatalogueItemValidator,
  createCatalogueItemValidator,
  catalogueItemHistoryValidator,
  indexCatalogueItemsValidator,
  lookupCatalogueItemsValidator,
  restoreCatalogueItemValidator,
  reviewCatalogueItemChangeValidator,
  reviewCatalogueItemCreationValidator,
  updateCatalogueItemClassificationValidator,
  updateCatalogueItemDetailsValidator,
} from '#validators/catalogue_item'

@inject()
export default class CatalogueItemsController {
  constructor(
    private administration: CatalogueItemAdministrationService,
    private classification: CatalogueItemClassificationService,
    private directory: CatalogueItemDirectoryService,
    private provisioning: CatalogueItemProvisioningService,
    private similarity: CatalogueItemSimilarityService,
    private versionDirectory: CatalogueItemVersionDirectoryService
  ) {}

  async store({ auth, bouncer, request, response }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('create')

    const payload = await request.validateUsing(createCatalogueItemValidator)

    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id)

    return response.created({ message: 'Catalogue item created.' })
  }

  async creationReview({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('review')

    const payload = await request.validateUsing(reviewCatalogueItemCreationValidator)

    const review = await this.similarity.review(payload)

    return serialize(CatalogueItemReviewTransformer.transform(review))
  }

  async changeReview({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('review')

    const payload = await request.validateUsing(reviewCatalogueItemChangeValidator)

    const review = await this.similarity.review(payload, params.catalogueCode)

    return serialize(CatalogueItemReviewTransformer.transform(review))
  }

  async updateDetails({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('updateDetails')

    const payload = await request.validateUsing(updateCatalogueItemDetailsValidator)

    const actor = auth.getUserOrFail()

    await this.administration.updateDetails(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item details updated.' })
  }

  async updateClassification({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('updateClassification')

    const payload = await request.validateUsing(updateCatalogueItemClassificationValidator)

    const actor = auth.getUserOrFail()

    await this.classification.update(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item classification updated.' })
  }

  async index({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('list')

    const filters = await request.validateUsing(indexCatalogueItemsValidator)

    const items = await this.directory.list(filters)

    return serialize(CatalogueItemTransformer.paginate(items.all(), items.getMeta()))
  }

  async lookup({ bouncer, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('list')

    const filters = await request.validateUsing(lookupCatalogueItemsValidator)

    const results = await this.directory.lookup(filters)

    for (const result of results) {
      result.item.$extras.matchKind = result.matchKind
    }

    return serialize(
      CatalogueItemTransformer.transform(results.map(({ item }) => item)).useVariant('forLookup')
    )
  }

  async show({ bouncer, params, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('view')

    const item = await this.directory.findDetails(params.catalogueCode)

    return serialize(CatalogueItemTransformer.transform(item).useVariant('forDetailedView'))
  }

  async history({ bouncer, params, request, serialize }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('view')

    const filters = await request.validateUsing(catalogueItemHistoryValidator)

    const versions = await this.versionDirectory.list(params.catalogueCode, filters)

    return serialize(CatalogueItemVersionTransformer.paginate(versions.all(), versions.getMeta()))
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('archive')

    const payload = await request.validateUsing(administerCatalogueItemValidator)

    const actor = auth.getUserOrFail()

    await this.administration.archive(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('restore')

    const payload = await request.validateUsing(restoreCatalogueItemValidator)

    const actor = auth.getUserOrFail()

    await this.administration.restore(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item restored.' })
  }
}
