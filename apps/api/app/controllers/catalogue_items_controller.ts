import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CatalogueItemPolicy from '#policies/catalogue_item_policy'
import CatalogueItemAdministrationService from '#services/catalogue_item_administration_service'
import CatalogueItemAttributeAdministrationService from '#services/catalogue_item_attribute_administration_service'
import CatalogueItemClassificationService from '#services/catalogue_item_classification_service'
import CatalogueItemDirectoryService from '#services/catalogue_item_directory_service'
import CatalogueItemProvisioningService from '#services/catalogue_item_provisioning_service'
import CatalogueItemSimilarityService from '#services/catalogue_item_similarity_service'
import CatalogueItemReviewTransformer from '#transformers/catalogue_item_review_transformer'
import CatalogueItemTransformer from '#transformers/catalogue_item_transformer'
import {
  administerCatalogueItemValidator,
  createCatalogueItemValidator,
  indexCatalogueItemsValidator,
  lookupCatalogueItemsValidator,
  restoreCatalogueItemValidator,
  reviewCatalogueItemChangeValidator,
  reviewCatalogueItemCreationValidator,
  updateCatalogueItemAttributeValuesValidator,
  updateCatalogueItemClassificationValidator,
  updateCatalogueItemDetailsValidator,
} from '#validators/catalogue_item'

@inject()
export default class CatalogueItemsController {
  constructor(
    private administration: CatalogueItemAdministrationService,
    private attributeAdministration: CatalogueItemAttributeAdministrationService,
    private classification: CatalogueItemClassificationService,
    private directory: CatalogueItemDirectoryService,
    private provisioning: CatalogueItemProvisioningService,
    private similarity: CatalogueItemSimilarityService
  ) {}

  async store({ request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('create')

    const payload = await request.validateUsing(createCatalogueItemValidator)
    const actor = auth.getUserOrFail()

    await this.provisioning.create(payload, actor.id)

    return response.created({ message: 'Catalogue item created.' })
  }

  async creationReview({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('review')

    const payload = await request.validateUsing(reviewCatalogueItemCreationValidator)

    return serialize(
      CatalogueItemReviewTransformer.transform(await this.similarity.review(payload))
    )
  }

  async changeReview({ params, request, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('review')

    const payload = await request.validateUsing(reviewCatalogueItemChangeValidator)

    return serialize(
      CatalogueItemReviewTransformer.transform(
        await this.similarity.review(payload, params.catalogueCode)
      )
    )
  }

  async updateDetails({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('updateDetails')

    const payload = await request.validateUsing(updateCatalogueItemDetailsValidator)
    const actor = auth.getUserOrFail()

    await this.administration.updateDetails(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item details updated.' })
  }

  async updateClassification({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('updateClassification')

    const payload = await request.validateUsing(updateCatalogueItemClassificationValidator)
    const actor = auth.getUserOrFail()

    await this.classification.update(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item classification updated.' })
  }

  async updateAttributeValues({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('updateAttributeValues')

    const payload = await request.validateUsing(updateCatalogueItemAttributeValuesValidator)
    const actor = auth.getUserOrFail()

    await this.attributeAdministration.update(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item attributes updated.' })
  }

  async index({ request, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('list')

    const filters = await request.validateUsing(indexCatalogueItemsValidator)
    const items = await this.directory.list(filters)

    return serialize(CatalogueItemTransformer.paginate(items.all(), items.getMeta()))
  }

  async lookup({ request, serialize, bouncer }: HttpContext) {
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

  async show({ params, serialize, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('view')

    const item = await this.directory.findDetails(params.catalogueCode)

    return serialize(CatalogueItemTransformer.transform(item).useVariant('forDetailedView'))
  }

  async archive({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('archive')

    const payload = await request.validateUsing(administerCatalogueItemValidator)
    const actor = auth.getUserOrFail()

    await this.administration.archive(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item archived.' })
  }

  async restore({ params, request, response, auth, bouncer }: HttpContext) {
    await bouncer.with(CatalogueItemPolicy).authorize('restore')

    const payload = await request.validateUsing(restoreCatalogueItemValidator)
    const actor = auth.getUserOrFail()

    await this.administration.restore(params.catalogueCode, payload, actor.id)

    return response.ok({ message: 'Catalogue item restored.' })
  }
}
