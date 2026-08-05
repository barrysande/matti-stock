import type { EffectiveAccessGrant } from '#types/role_assignment'

export const BASE_UNIT_KINDS = ['COUNTABLE', 'MEASURED'] as const
export type BaseUnitKind = (typeof BASE_UNIT_KINDS)[number]

export const CATALOGUE_CATEGORY_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'REPARENTED',
  'ARCHIVED',
  'RESTORED',
] as const
export type CatalogueCategoryChangeKind = (typeof CATALOGUE_CATEGORY_CHANGE_KINDS)[number]

export const BASE_UNIT_CHANGE_KINDS = [
  'CREATED',
  'DETAILS_UPDATED',
  'ARCHIVED',
  'RESTORED',
] as const
export type BaseUnitChangeKind = (typeof BASE_UNIT_CHANGE_KINDS)[number]

export interface CatalogueAuthorization {
  grant: EffectiveAccessGrant
  instituteOrganizationalUnitId: string
}
