import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import CategoryAttributePolicy from '#policies/category_attribute_policy'
import CategoryAttributeChoiceAdministrationService from '#services/category_attribute_choice_administration_service'
import {
  addCategoryAttributeChoiceValidator,
  administerCategoryAttributeChoiceValidator,
  reorderCategoryAttributeChoicesValidator,
  updateCategoryAttributeChoiceDetailsValidator,
} from '#validators/category_attribute'

@inject()
export default class CategoryAttributeChoicesController {
  constructor(private administration: CategoryAttributeChoiceAdministrationService) {}

  async store({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('addChoice')

    const payload = await request.validateUsing(addCategoryAttributeChoiceValidator)

    const actor = auth.getUserOrFail()

    await this.administration.add(params.id, payload, actor.id)

    return response.created({ message: 'Predefined choice added.' })
  }

  async updateDetails({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('updateChoice')

    const payload = await request.validateUsing(updateCategoryAttributeChoiceDetailsValidator)

    const actor = auth.getUserOrFail()

    await this.administration.updateDetails(params.id, params.choiceId, payload, actor.id)

    return response.ok({ message: 'Predefined choice label updated.' })
  }

  async reorder({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('reorderChoices')

    const payload = await request.validateUsing(reorderCategoryAttributeChoicesValidator)

    const actor = auth.getUserOrFail()

    await this.administration.reorder(params.id, payload, actor.id)

    return response.ok({ message: 'Predefined choices reordered.' })
  }

  async archive({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('archiveChoice')

    const payload = await request.validateUsing(administerCategoryAttributeChoiceValidator)

    const actor = auth.getUserOrFail()

    await this.administration.archive(params.id, params.choiceId, payload, actor.id)

    return response.ok({ message: 'Predefined choice archived.' })
  }

  async restore({ auth, bouncer, params, request, response }: HttpContext) {
    await bouncer.with(CategoryAttributePolicy).authorize('restoreChoice')

    const payload = await request.validateUsing(administerCategoryAttributeChoiceValidator)

    const actor = auth.getUserOrFail()

    await this.administration.restore(params.id, params.choiceId, payload, actor.id)

    return response.ok({ message: 'Predefined choice restored.' })
  }
}
