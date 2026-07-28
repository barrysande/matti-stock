import { createHash } from 'node:crypto'
import AccessEvent from '#models/access_event'
import type { RecordAccessEvent } from '#types/access'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export default class AccessEventService {
  fingerprintIdentifier(identifier: string) {
    return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex')
  }

  record(event: RecordAccessEvent, client?: TransactionClientContract) {
    return AccessEvent.create(
      {
        eventType: event.eventType,
        actorType: event.actorType,
        actorAccountId: event.actorAccountId ?? null,
        targetType: event.targetType,
        targetId: event.targetId ?? null,
        reason: event.reason ?? null,
        identifierFingerprint: event.identifierFingerprint ?? null,
        requestIp: event.request?.ip ?? null,
        requestId: event.request?.requestId ?? null,
        metadata: event.metadata ?? {},
      },
      client ? { client } : undefined
    )
  }
}
