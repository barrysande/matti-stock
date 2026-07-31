import { BaseTransformer } from '@adonisjs/core/transformers'
import type AccessEvent from '#models/access_event'
import {
  accountAccessEventCategory,
  type AccountAccessEventTargetContext,
} from '#types/access_event'

function metadataFor(resource: AccessEvent) {
  return resource.metadata && typeof resource.metadata === 'object'
    ? (resource.metadata as Record<string, unknown>)
    : {}
}

function stringValue(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === 'string' ? metadata[key] : undefined
}

function numberValue(metadata: Record<string, unknown>, key: string) {
  return typeof metadata[key] === 'number' ? metadata[key] : undefined
}

function stringArray(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : undefined
}

function details(resource: AccessEvent) {
  const metadata = metadataFor(resource)
  const category = accountAccessEventCategory(resource.eventType)

  if (category === 'ACCOUNT') {
    return {
      previousStatus: stringValue(metadata, 'previousStatus'),
      status: stringValue(metadata, 'status'),
    }
  }
  if (category === 'AUTHENTICATION') {
    return {
      accountStatus: stringValue(metadata, 'accountStatus') ?? stringValue(metadata, 'status'),
    }
  }
  if (category === 'CREDENTIAL') {
    return {
      purpose: stringValue(metadata, 'purpose') ?? stringValue(metadata, 'challengePurpose'),
      outcomeReason: stringValue(metadata, 'reason'),
      accountStatus: stringValue(metadata, 'status'),
    }
  }
  if (category === 'ROLE_ASSIGNMENT') {
    return {
      accountId: stringValue(metadata, 'accountId'),
      roleId: stringValue(metadata, 'roleId'),
      roleVersionId: stringValue(metadata, 'roleVersionId'),
      roleVersion: numberValue(metadata, 'roleVersion'),
      scopeOrganizationalUnitId: stringValue(metadata, 'scopeOrganizationalUnitId'),
      scopeMode: stringValue(metadata, 'scopeMode'),
      startsAt: stringValue(metadata, 'startsAt'),
      expiresAt: stringValue(metadata, 'expiresAt'),
      effectiveAt: stringValue(metadata, 'effectiveAt'),
      replacementAssignmentId: stringValue(metadata, 'replacementAssignmentId'),
    }
  }
  if (category === 'DELEGATION') {
    return {
      delegatorAccountId: stringValue(metadata, 'delegatorAccountId'),
      delegateAccountId: stringValue(metadata, 'delegateAccountId'),
      sourceAssignmentIds: stringArray(metadata, 'sourceAssignmentIds'),
      startsAt: stringValue(metadata, 'startsAt'),
      expiresAt: stringValue(metadata, 'expiresAt'),
      effectiveAt: stringValue(metadata, 'effectiveAt'),
    }
  }
  return {}
}

function authorization(resource: AccessEvent) {
  const metadata = metadataFor(resource)
  const roleAssignmentId = stringValue(metadata, 'authorityAssignmentId')
  const effectivePermission = stringValue(metadata, 'effectivePermission')
  return roleAssignmentId || effectivePermission
    ? {
        roleAssignmentId,
        effectivePermission,
      }
    : null
}

export default class AccessEventTransformer extends BaseTransformer<AccessEvent> {
  toObject() {
    const actor = this.resource.actorType === 'ACCOUNT' ? this.resource.actorAccount : null
    return {
      id: this.resource.id,
      eventType: this.resource.eventType,
      category: accountAccessEventCategory(this.resource.eventType),
      occurredAt: this.resource.createdAt,
      reason: this.resource.reason,
      actor:
        this.resource.actorType === 'SYSTEM'
          ? { type: 'SYSTEM' as const, account: null }
          : {
              type: 'ACCOUNT' as const,
              account: actor
                ? {
                    id: actor.id,
                    person: {
                      id: actor.person.id,
                      displayName: actor.person.displayName,
                    },
                  }
                : null,
            },
      target: {
        type: this.resource.targetType,
        id: this.resource.targetId,
        context:
          (this.resource.$extras.timelineTarget as AccountAccessEventTargetContext | undefined) ??
          null,
      },
      authorization: authorization(this.resource),
      details: details(this.resource),
    }
  }
}
