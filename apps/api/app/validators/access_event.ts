import vine from '@vinejs/vine'
import { ACCOUNT_ACCESS_EVENT_CATEGORIES } from '#types/access_event'

export const indexAccountAccessEventsValidator = vine.create({
  page: vine.number().withoutDecimals().min(1).optional(),
  category: vine.enum(ACCOUNT_ACCESS_EVENT_CATEGORIES).optional(),
  eventType: vine.string().trim().minLength(1).maxLength(100).optional(),
})
