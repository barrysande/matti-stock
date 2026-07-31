import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import AccessPolicy from '#policies/access_policy'
import AccountAccessEventTimelineService from '#services/account_access_event_timeline_service'
import AccessEventTransformer from '#transformers/access_event_transformer'
import { indexAccountAccessEventsValidator } from '#validators/access_event'

@inject()
export default class AccountAccessEventsController {
  constructor(private timeline: AccountAccessEventTimelineService) {}

  async index({ params, request, serialize, bouncer }: HttpContext) {
    await bouncer.with(AccessPolicy).authorize('viewTimeline')

    const filters = await request.validateUsing(indexAccountAccessEventsValidator)
    const events = await this.timeline.list(params.id, filters)

    return serialize(AccessEventTransformer.paginate(events.all(), events.getMeta()))
  }
}
